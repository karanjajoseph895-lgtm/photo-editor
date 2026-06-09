import { useState, useRef, useCallback } from "react";
import { Upload, Wand2, Download, Loader2, ImageIcon, X, AlertCircle, Check } from "lucide-react";

// Read API token from Vite env
const API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;

export default function AIPhotoEditor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setDebugInfo("");
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const editImage = async () => {
    if (!originalImage || !prompt) return;

    // Check token
    if (!API_TOKEN) {
      setError("API token not found. Make sure VITE_REPLICATE_API_TOKEN is set in Vercel Environment Variables and the site was redeployed AFTER adding it.");
      setDebugInfo("Token value: " + (API_TOKEN || "undefined"));
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Uploading image...");
    setDebugInfo("Token found: " + API_TOKEN.substring(0, 10) + "...");

    try {
      // Step 1: Upload image to get a public URL
      // We'll use a data URI approach - convert base64 to a file and upload to a temporary service
      // Actually, for Replicate, we can try sending the base64 directly first

      setStatus("Sending to AI...");

      // Use Replicate's API with the instruct-pix2pix model
      // Model: timbrooks/instruct-pix2pix
      // Version from replicate.com/timbrooks/instruct-pix2pix
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${API_TOKEN}`,
          "Content-Type": "application/json",
          "Prefer": "wait",
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

      setDebugInfo(prev => prev + "\nResponse status: " + response.status);

      if (!response.ok) {
        const errText = await response.text();
        setDebugInfo(prev => prev + "\nError response: " + errText.substring(0, 200));
        throw new Error(`API Error ${response.status}: ${errText.substring(0, 100)}`);
      }

      const prediction = await response.json();
      setDebugInfo(prev => prev + "\nPrediction status: " + prediction.status);

      if (prediction.output) {
        const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        setEditedImage(output);
        setStatus("Done!");
      } else if (prediction.id) {
        // Need to poll
        setStatus("AI is processing... (30-60s)");

        let result = prediction;
        let attempts = 0;

        while (result.status !== "succeeded" && result.status !== "failed" && attempts < 90) {
          await new Promise(r => setTimeout(r, 1000));
          setStatus(`AI is working... (${attempts + 1}s)`);

          const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { Authorization: `Token ${API_TOKEN}` },
          });

          if (!poll.ok) throw new Error("Lost connection");
          result = await poll.json();
          attempts++;
        }

        if (result.status === "succeeded") {
          const output = Array.isArray(result.output) ? result.output[0] : result.output;
          setEditedImage(output);
          setStatus("Done!");
          setDebugInfo(prev => prev + "\nSuccess! Output: " + (output?.substring(0, 50) || "none"));
        } else {
          throw new Error(result.error || "AI failed");
        }
      } else {
        throw new Error("Invalid API response");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("");
      setDebugInfo(prev => prev + "\nError: " + msg);
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
    setDebugInfo("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            AI Photo Editor
          </h1>
          <p className="text-gray-400 text-lg">Upload a photo, describe what you want changed.</p>
          {!API_TOKEN && (
            <div className="mt-4 inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              API token not detected! Add VITE_REPLICATE_API_TOKEN to Vercel Environment Variables, then redeploy.
            </div>
          )}
        </div>

        {!originalImage && (
          <div
            className="border-2 border-dashed border-gray-700 rounded-2xl p-16 text-center cursor-pointer hover:border-gray-500 hover:bg-gray-800/30 transition-all"
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
            <Upload className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <p className="text-lg font-medium">Drop your photo here or click to upload</p>
            <p className="text-gray-500 text-sm mt-1">JPG, PNG, WEBP up to 10MB</p>
          </div>
        )}

        {originalImage && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden border border-gray-700">
                <div className="bg-black/50 px-3 py-1 text-xs font-medium">Original</div>
                <img src={originalImage} alt="Original" className="w-full object-contain max-h-[500px]" />
              </div>
              <div className="rounded-xl overflow-hidden border border-purple-500/30">
                <div className="bg-purple-600/50 px-3 py-1 text-xs font-medium">AI Edited</div>
                {editedImage ? (
                  <img src={editedImage} alt="Edited" className="w-full object-contain max-h-[500px]" />
                ) : (
                  <div className="w-full min-h-[300px] flex items-center justify-center text-gray-500">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">What do you want to change?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., remove the text, make the sky blue, remove the person..."
                className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 h-24 resize-none"
              />

              {status && (
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 text-sm flex items-center gap-2">
                  {status === "Done!" ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  {status}
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {debugInfo && (
                <details className="mt-3">
                  <summary className="text-gray-500 text-xs cursor-pointer">Debug info</summary>
                  <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">{debugInfo}</pre>
                </details>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={editImage}
                  disabled={loading || !prompt}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Wand2 className="w-5 h-5" /> Edit with AI</>}
                </button>
                {editedImage && (
                  <a href={editedImage} download target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg flex items-center gap-2 transition-all">
                    <Download className="w-5 h-5" /> Download
                  </a>
                )}
                <button onClick={clearAll} className="bg-gray-700 hover:bg-red-600/80 text-white py-3 px-4 rounded-lg transition-all">
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
