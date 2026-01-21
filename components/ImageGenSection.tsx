
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ImageResult } from '../types';

const ImageGenSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setResults(prev => [{ url: imageUrl, prompt, timestamp: Date.now() }, ...prev]);
        setPrompt('');
      } else {
        alert('Could not find image in model response');
      }
    } catch (error) {
      console.error('Image gen error:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Turn imagination into reality</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Use the power of Gemini 2.5 Flash Image to generate high-fidelity visuals from simple text descriptions.
        </p>
      </div>

      <div className="glass p-6 rounded-3xl mb-12 shadow-2xl">
        <div className="flex flex-col gap-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision (e.g., 'A futuristic city at night with neon lights and flying cars, cyberpunk style')..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 min-h-[120px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Aspect Ratio:</span>
              <div className="flex gap-2">
                {['1:1', '16:9', '9:16', '3:4', '4:3'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-magic"></i>
                  Generate Image
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((res, i) => (
          <div key={i} className="group relative glass rounded-2xl overflow-hidden shadow-lg transition-all hover:translate-y-[-4px]">
            <img src={res.url} alt={res.prompt} className="w-full h-auto object-cover aspect-square bg-slate-800" />
            <div className="p-4 bg-slate-900/90 backdrop-blur-sm">
              <p className="text-xs text-slate-300 line-clamp-2 italic">"{res.prompt}"</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">{new Date(res.timestamp).toLocaleDateString()}</span>
                <button 
                   onClick={() => {
                     const link = document.createElement('a');
                     link.href = res.url;
                     link.download = `gemini-gen-${i}.png`;
                     link.click();
                   }}
                   className="text-indigo-400 hover:text-indigo-300 text-xs"
                >
                  <i className="fas fa-download mr-1"></i> Download
                </button>
              </div>
            </div>
          </div>
        ))}
        {results.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center glass rounded-2xl">
            <i className="fas fa-images text-4xl text-slate-700 mb-4"></i>
            <p className="text-slate-500">No images generated yet. Start your journey above!</p>
          </div>
        )}
        {loading && (
          <div className="glass rounded-2xl aspect-square flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
            <p className="text-sm font-medium text-slate-400">Gemini is sketching your idea...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenSection;
