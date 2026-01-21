
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';

const LiveSection: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: string, text: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext, output: AudioContext } | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current = null;
    }
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
      audioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setIsSpeaking(false);
  }, []);

  const startSession = async () => {
    if (isActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCameraOn });
      if (videoRef.current && isCameraOn) {
        videoRef.current.srcObject = stream;
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: 'You are a helpful, enthusiastic AI companion in a live conversation. Keep responses natural and conversational.'
        },
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmData = encode(new Uint8Array(int16.buffer));
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            if (isCameraOn && videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                frameIntervalRef.current = window.setInterval(() => {
                  if (videoRef.current && canvasRef.current && ctx) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    ctx.drawImage(videoRef.current, 0, 0);
                    canvasRef.current.toBlob(async (blob) => {
                      if (blob) {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => {
                          const base64 = (reader.result as string).split(',')[1];
                          sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                        };
                      }
                    }, 'image/jpeg', 0.6);
                  }
                }, 1000);
            }
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const outCtx = audioContextRef.current?.output;
              if (outCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                const source = outCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outCtx.destination);
                source.onended = () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) setIsSpeaking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: stopSession,
          onclose: stopSession,
        }
      });

      sessionRef.current = sessionPromise;
      setIsActive(true);

    } catch (err) {
      console.error('Session error:', err);
      alert('Could not access media devices or start session.');
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 overflow-hidden">
      <div className="w-full max-w-4xl glass rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
        <div className="flex-1 bg-slate-900 relative min-h-[300px] flex items-center justify-center">
          {isCameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
             <div className="text-center p-8">
               <div className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center transition-all duration-500 ${
                 isSpeaking ? 'bg-indigo-600 scale-110 shadow-[0_0_50px_rgba(79,70,229,0.5)]' : 'bg-slate-800'
               }`}>
                 <i className={`fas fa-wave-square text-4xl ${isSpeaking ? 'text-white' : 'text-slate-600'}`}></i>
               </div>
               <p className="text-slate-400 font-medium tracking-wide">
                 {isActive ? (isSpeaking ? 'Gemini is speaking...' : 'Listening to you...') : 'Ready to start'}
               </p>
             </div>
          )}
          
          {isActive && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="px-3 py-1 rounded-full bg-red-500/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                 Live
              </div>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="w-full md:w-80 p-8 glass flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-700">
          <div>
            <h3 className="text-xl font-bold mb-2">Multimodal Live</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Experience seamless, real-time voice and vision interaction with Gemini's native audio model.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setIsCameraOn(!isCameraOn)}
                disabled={isActive}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                  isCameraOn ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-slate-800 text-slate-500'
                }`}
              >
                <i className={`fas ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                <div className="text-left">
                  <p className="text-sm font-bold">Video Feed</p>
                  <p className="text-[10px] opacity-60">{isCameraOn ? 'Camera enabled' : 'Voice only'}</p>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {!isActive ? (
              <button 
                onClick={startSession}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
              >
                Connect Now
              </button>
            ) : (
              <button 
                onClick={stopSession}
                className="w-full py-4 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-red-600/20 hover:border-red-500/50 text-white font-bold transition-all active:scale-95"
              >
                Disconnect
              </button>
            )}
            <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-medium">
              Powered by gemini-2.5-flash
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {[
          { icon: 'fa-microphone', label: 'Audio Stream', color: 'blue' },
          { icon: 'fa-eye', label: 'Vision Processing', color: 'purple' },
          { icon: 'fa-bolt', label: 'Ultra-low Latency', color: 'yellow' }
        ].map((item, i) => (
          <div key={i} className="glass p-4 rounded-2xl flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500`}>
              <i className={`fas ${item.icon}`}></i>
            </div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveSection;
