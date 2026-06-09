import { useState, useRef, useCallback } from "react";
import { Upload, Wand2, Download, Loader2, ImageIcon, X, AlertCircle, Check } from "lucide-react";

const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;

export default function AIPhotoEditor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasToken = !!REPLICATE_API_TOKEN;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setEditedImage(null);
      setError("");
      setStatus("");
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const editImage = async () => {
    if (!originalImage || !prompt) return;
    if (!hasToken) {
      setError("Add VITE_REPLICATE_API_TOKEN to Vercel Environment Variables first.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Sending to AI...");

    try {
      // Use Replicate's instruct-pix2pix model for text-based editing
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "30c1d0b915a6c9e9295c0d8c8b8e7f6d5c4b3a291807f6e5d4c3b2a1908f7e6",
          input: {
            image: originalImage,
            prompt: prompt,
            num_inference_steps: 20,
            guidance_scale: 7.5,
            image_guidance_scale: 1.5,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const prediction = await response.json();
      setStatus("AI is processing... (30-60 seconds)");

      // Poll for result
      let result = prediction;
      let attempts = 0;

      while (result.status !== "succeeded" && result.status !== "failed" && attempts < 90) {
        await new Promise(r => setTimeout(r, 1000));
        setStatus(`AI is working... (${attempts + 1}s)`);

        const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        });

        if (!poll.ok) throw new Error("Lost connection to AI");
        result = await poll.json();
        attempts++;
      }

      if (result.status === "succeeded") {
        const output = Array.isArray(result.output) ? result.output[0] : result.output;
        setEditedImage(output);
        setStatus("Done!");
      } else if (result.status === "failed") {
        throw new Error(result.error || "AI editing failed");
      } else {
        throw new Error("Timed out. Try a simpler prompt.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Check your API token.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt("");
    setError("");
    setStatus("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            AI Photo Editor
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Upload any photo, describe what you want — remove objects, replace text, edit faces, anything.
          </p>
          {!hasToken && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              API token not set. Add VITE_REPLICATE_API_TOKEN in Vercel Environment Variables.
            </div>
          )}
        </div>

        {/* Upload */}
        {!originalImage && (
          <div
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer
              ${dragActive ? "border-purple-500 bg-purple-500/10 scale-[1.02]" : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
            <div className="bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-xl font-semibold mb-2">Drop your photo here</p>
            <p className="text-gray-500">or click to browse • JPG, PNG, WEBP</p>
          </div>
        )}

        {/* Editor */}
        {originalImage && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Images */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50">
                <div className="absolute top-3 left-3 bg-black/70 px-3 py-1 rounded-full text-xs font-semibold z-10">Original</div>
                <img src={originalImage} alt="Original" className="w-full object-contain max-h-[500px]" />
              </div>
              <div className="relative rounded-xl overflow-hidden border border-purple-500/30 bg-gray-900/50">
                <div className="absolute top-3 left-3 bg-purple-600/80 px-3 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> AI Edited
                </div>
                {editedImage ? (
                  <img src={editedImage} alt="Edited" className="w-full object-contain max-h-[500px]" />
                ) : (
                  <div className="w-full min-h-[400px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Result will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">What do you want to change?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Examples: Remove the person in red • Change text to 'Hello' • Make sky blue • Remove watermark"
                className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 h-24 resize-none"
              />

              {status && (
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 text-sm flex items-center gap-2">
                  {status === "Done!" ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  {status}
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={editImage}
                  disabled={loading || !prompt || !hasToken}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Editing...</> : <><Wand2 className="w-5 h-5" /> Edit with AI</>}
                </button>
                {editedImage && (
                  <a href={editedImage} download target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-all border border-gray-600">
                    <Download className="w-5 h-5" /> Download
                  </a>
                )}
                <button onClick={clearAll} className="bg-gray-700 hover:bg-red-600/80 text-white py-3 px-4 rounded-lg transition-all border border-gray-600" title="Start over">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
