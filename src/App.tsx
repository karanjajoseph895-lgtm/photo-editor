import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, Upload, Image as ImageIcon, Sparkles } from 'lucide-react'
import './App.css'

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEdit = () => {
    if (!selectedImage || !prompt) return
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">AuraFrame</h1>
          <span className="text-sm text-muted-foreground ml-2">AI Photo Editor</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Edit Photos with AI
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload any photo, describe your edit in natural language, and let AI do the rest
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Photo
            </CardTitle>
            <CardDescription>
              Select an image to start editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to 10MB
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {selectedImage && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={selectedImage}
                alt="Uploaded"
                className="max-w-full rounded-lg mx-auto"
                style={{ maxHeight: '400px' }}
              />
            </CardContent>
          </Card>
        )}

        {selectedImage && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Describe Your Edit
              </CardTitle>
              <CardDescription>
                Tell AI what you want to change
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your editing instructions..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mb-4 min-h-[100px]"
              />
              <Button
                onClick={handleEdit}
                disabled={!prompt || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Apply AI Edit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { title: 'Remove Objects', desc: 'Erase unwanted items from photos' },
            { title: 'Change Style', desc: 'Transform into paintings, sketches, etc.' },
            { title: 'Enhance Quality', desc: 'Upscale and improve image clarity' },
          ].map((feature, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p> AuraFrame AI Photo Editor. Built with React + Vite + Tailwind.</p>
      </footer>
    </div>
  )
}

export default App
