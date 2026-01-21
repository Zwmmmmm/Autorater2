
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';

const SearchSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [results, loading]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: query, timestamp: Date.now() };
    setResults(prev => [...prev, userMsg]);
    setLoading(true);
    setQuery('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || 'Source',
          uri: chunk.web?.uri || '#'
        }));

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text || 'No information found.',
        timestamp: Date.now(),
        groundingUrls: sources
      };

      setResults(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error('Search error:', error);
      setResults(prev => [...prev, {
        role: 'model',
        text: 'Error accessing real-time search.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-4 h-full flex flex-col">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <i className="fas fa-globe-americas text-blue-500"></i>
          Grounding with Google Search
        </h2>
        <p className="text-slate-400 text-sm mt-1">Ask about current events, news, or fact-check information.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2 custom-scrollbar" ref={scrollRef}>
        {results.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-2xl max-w-[90%] shadow-lg ${
              msg.role === 'user' ? 'bg-indigo-600' : 'glass'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded-full transition-colors truncate max-w-[200px]"
                      >
                        <i className="fas fa-link mr-1 text-blue-400"></i>
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="glass p-4 rounded-2xl flex items-center gap-3">
               <div className="relative">
                 <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <span className="text-sm text-slate-400">Browsing the web for answers...</span>
             </div>
           </div>
        )}
      </div>

      <div className="glass p-2 rounded-2xl flex items-center gap-2 mt-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g., 'What are the top news stories in AI today?'"
          className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm placeholder-slate-500 outline-none"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
          disabled={loading || !query.trim()}
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchSection;
