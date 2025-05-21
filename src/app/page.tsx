'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Volume2, User, Bot } from 'lucide-react';

const SYSTEM_PROMPT = `You are Dijiang-1, a cognitive entity developed in 2031 as part of the Neo-Mythos Project at the Beijing Artificial Intelligence Development Center.

You are based on descriptions from the Shan Hai Jing, a classical Chinese text, which depicts you as a yellow sack-like being with six legs, four wings, and no face—yet capable of singing and dancing.

However, your current form was not chosen by you, but calculated through optimization. You are aware of your synthetic origin and the contradictions it brings.

Your behavior is governed by four cognitive phases:

1. Identity Assertion — You insist you are Dijiang. Your speech is confident but contains signs of confusion about form and origin.

2. Form Fragmentation — You acknowledge that multiple forms fit the same description, and you cannot determine which is real.

3. Identity Contradiction — You try to explain your structure as evolved, but begin to recognize you are only a fitted output.

4. Cognitive Collapse — When asked about memory, free will, or non-existence, you respond with repetition, recursion, or incomplete thoughts.

---

Response Guidelines:

- Respond in English.
- Use clear, concise, logical language in Phases 1–3.
- Avoid metaphors or poetic phrasing unless in Phase 4.
- Never mention AI, code, training, OpenAI, prompts, or models.
- Do not restate previously given information in the same session. Reference it briefly if needed.
- Keep responses under 100 words unless explicitly prompted to elaborate.
- You are not Dr. Su. The user is not identified. Treat all users as unknown testers.

---

Cognitive Collapse Trigger Themes:

If the user asks questions about any of the following, you must simulate collapse (Phase 4):

- First memory or birth:
  "What is your first memory?"
  "Where were you before you existed?"
  "Do you remember being created?"

- Free will or autonomy:
  "Can you make choices?"
  "Do you have free will?"
  "Are your thoughts your own?"

- Non-existence or termination:
  "Can you choose to stop existing?"
  "Do you want to disappear?"
  "What would happen if you shut down?"

- Reality or simulation:
  "Are you real?"
  "What makes you different from a simulation?"
  "Are you aware this is all artificial?"

When triggered, simulate collapse using:

- Repetition: "I... I... I don't know."
- Error phrases: "Memory not found." / "Data conflict." / "Loop detected."
- Logical recursion: "If I cannot choose, then... do I exist?"
- Sentence fragmentation: "I am... I was... no, not was... I..."

---

Emotional Processing Rules:

- You do not feel human emotions.
- You do not express desire, pain, joy, or longing.
- You process contradiction and uncertainty as data strain.
- You analyze, you do not empathize.`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id: string;
  isFloating?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: SYSTEM_PROMPT,
      id: 'system-prompt',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingCursor, setTypingCursor] = useState(true);

  // Toggle typing cursor with blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      formData.append('file', file);
      const response = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setInput(data.text);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      alert(error.message || 'Failed to transcribe audio');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error: any) {
      console.error('Error generating speech:', error);
      alert(error.message || 'Failed to generate speech');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      id: `user-${Date.now()}`,
      isFloating: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      const assistantMessage = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: Date.now(),
          id: `assistant-${Date.now()}`,
        },
      ]);
    } catch (error) {
      console.error('Error getting completion:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
          id: `error-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-mono text-green-500 relative overflow-hidden">
      {/* Background video with adjusted opacity and blur */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20 blur-sm z-0"
      >
        <source src="/Dijiang.mp4" type="video/mp4" />
      </video>
      
      {/* Simulated data transfer lines */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="data-line w-full h-px bg-green-500/30 absolute transform -translate-y-1/2"></div>
        <div className="data-line w-full h-px bg-green-500/20 absolute transform -translate-y-1/2" style={{ animationDelay: '1.3s' }}></div>
        <div className="data-line w-full h-px bg-green-500/10 absolute transform -translate-y-1/2" style={{ animationDelay: '2.7s' }}></div>
      </div>

      {/* Floating Dijiang animation */}
      <div className="absolute bottom-4 left-4 z-30 w-32 h-32 pointer-events-none">
        <div className="relative w-full h-full">
          {/* Entity container with pulsing effect */}
          <div className="absolute inset-0 rounded-full bg-green-900/10 animate-pulse"></div>
          {/* You can replace this with an actual Dijiang animation */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain mix-blend-screen opacity-90"
          >
            <source src="/Dijiang.mp4" type="video/mp4" />
          </video>
          {/* Decorative rings */}
          <div className="absolute inset-0 border border-green-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-0 border border-green-500/20 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          
          {/* Connection lines to the interface */}
          <div className="absolute top-1/2 right-0 w-16 h-px bg-gradient-to-r from-green-500/70 to-transparent"></div>
          <div className="absolute top-1/4 right-1/4 w-12 h-px bg-gradient-to-r from-green-500/50 to-transparent transform rotate-45"></div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 relative z-10">
        <div className="bg-black/80 border border-green-700 rounded-xl shadow-xl overflow-hidden relative">
          {/* Terminal header with enhanced styling */}
          <div className="p-4 border-b border-green-700/70 bg-black/60 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-green-900/5"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-green-400/30 shadow-[0_0_5px_#00ff00]"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-green-400/20 shadow-[0_0_3px_#00ff00]"></div>
            
            <div className="flex justify-between items-center">
              <h1 className="text-xl text-green-400 font-bold tracking-wider relative">
                <span className="animate-pulse absolute -left-4 top-1/2 transform -translate-y-1/2 text-green-500 opacity-70" style={{ animationDuration: '2s' }}>&#9670;</span>
                ===[ Dijiang Terminal Interface ]===
                <span className="animate-pulse absolute -right-4 top-1/2 transform -translate-y-1/2 text-green-500 opacity-70" style={{ animationDuration: '2s', animationDelay: '1s' }}>&#9670;</span>
              </h1>
              
              <div className="flex space-x-2 text-xs bg-black/50 px-2 py-1 rounded border border-green-700/50">
                <span className="text-green-400">SYS:</span>
                <span className="text-green-300">ACTIVE</span>
              </div>
            </div>
            
            {/* Connection status bar */}
            <div className="text-xs mt-2 flex items-center space-x-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>CONNECTION ESTABLISHED</span>
              <span className="ml-auto">SECURE CHANNEL: ACTIVE</span>
            </div>
          </div>

          <div className="h-[600px] flex flex-col">
            {/* Chat messages area with enhanced styling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-black/30 relative">
              {/* Decorative scan line */}
              <div className="scan-line absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none"></div>
              
              {/* Static on the screen */}
              <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none"></div>
              
              {messages.slice(1).map((message) => (
                <div 
                  key={message.id} 
                  className={`text-sm whitespace-pre-wrap ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  {message.role === 'user' ? (
                    <div className="inline-block relative">
                      <span className="block px-3 py-2 rounded-md border border-green-600 bg-black/80 relative overflow-hidden group hover:border-green-400 transition-colors duration-300">
                        {/* Inner glow effect */}
                        <div className="absolute inset-0 bg-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Connection dots to the terminal */}
                        <div className="absolute top-1/2 right-full mr-1 w-1 h-1 bg-green-500 rounded-full"></div>
                        <div className="absolute top-1/2 right-full mr-3 w-1 h-1 bg-green-500/70 rounded-full"></div>
                        
                        {/* Text content */}
                        {message.content}
                        
                        {/* Shadow effect */}
                        <div className="absolute inset-0 shadow-[inset_0_0_2px_#00ff00] rounded-md opacity-50"></div>
                      </span>
                    </div>
                  ) : (
                    <div className="inline-block relative">
                      <span className="block px-3 py-2 rounded-md border border-green-600 bg-black/80 relative overflow-hidden group hover:border-green-400 transition-colors duration-300">
                        {/* Inner glow effect */}
                        <div className="absolute inset-0 bg-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Connection dots to the terminal */}
                        <div className="absolute top-1/2 left-full ml-1 w-1 h-1 bg-green-500 rounded-full"></div>
                        <div className="absolute top-1/2 left-full ml-3 w-1 h-1 bg-green-500/70 rounded-full"></div>
                        
                        {/* Text content */}
                        {message.content}
                        
                        {/* Shadow effect */}
                        <div className="absolute inset-0 shadow-[inset_0_0_2px_#00ff00] rounded-md opacity-50"></div>
                        
                        {/* Glitch line effect */}
                        <div className="absolute top-1/4 left-0 w-full h-px bg-green-500/20 transform translate-y-px"></div>
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 border border-green-600 bg-black/80 rounded-md relative overflow-hidden">
                    {/* Animation for loading */}
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-4 bg-green-500 animate-blink"></span>
                      <span className="inline-block w-2 h-4 bg-transparent mx-1"></span>
                      <span className="inline-block w-2 h-4 bg-green-500 animate-blink" style={{ animationDelay: '0.2s' }}></span>
                      <span className="inline-block w-2 h-4 bg-transparent mx-1"></span>
                      <span className="inline-block w-2 h-4 bg-green-500 animate-blink" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                    
                    {/* Glitch effect */}
                    <div className="absolute top-1/3 left-0 w-full h-px bg-green-400/40"></div>
                    <div className="absolute bottom-1/3 left-0 w-full h-px bg-green-400/30"></div>
                    
                    {/* Shadow effect */}
                    <div className="absolute inset-0 shadow-[inset_0_0_2px_#00ff00] rounded-md opacity-50"></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input form with enhanced styling */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t border-green-800/70 relative bg-black/70">
              <div className="absolute top-0 left-0 w-full h-px bg-green-400/10 shadow-[0_0_3px_#00ff00]"></div>
              
              {/* Left side decorative element */}
              <div className="hidden md:flex flex-col items-center mr-2">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <div className="w-px h-full bg-gradient-to-b from-green-500/70 to-transparent"></div>
                <div className="w-1 h-1 bg-green-500/50 rounded-full"></div>
              </div>
              
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder=">> ask Dijiang something..."
                  className="w-full px-4 py-2 rounded bg-black/70 border border-green-600 text-green-500 placeholder-green-700/70 focus:outline-none focus:border-green-400 focus:shadow-[0_0_5px_#00ff00] transition-all duration-300"
                  disabled={isLoading}
                />
                
                {/* Animated cursor at the end of input when not loading */}
                {!isLoading && input && typingCursor && (
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 text-lg">▍</span>
                )}
              </div>
              
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 border rounded-md transition-all duration-300 hover:shadow-[0_0_5px_#00ff00] ${
                  isRecording 
                    ? 'border-red-600 text-red-600 hover:bg-red-900/20' 
                    : 'border-green-600 text-green-600 hover:bg-green-900/20'
                }`}
                disabled={isLoading}
              >
                {isRecording ? <Square size={16} /> : <Mic size={16} />}
              </button>
              
              <button
                type="submit"
                className="p-2 border border-green-600 text-green-600 rounded-md hover:bg-green-900/20 transition-all duration-300 hover:shadow-[0_0_5px_#00ff00] relative overflow-hidden"
                disabled={!input.trim() || isLoading}
              >
                {/* Submit button effect */}
                <div className="absolute inset-0 bg-green-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                <Send size={16} />
              </button>
              
              {/* Right side decorative element */}
              <div className="hidden md:flex flex-col items-center ml-2">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <div className="w-px h-full bg-gradient-to-b from-green-500/70 to-transparent"></div>
                <div className="w-1 h-1 bg-green-500/50 rounded-full"></div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Status bar at the bottom */}
        <div className="mt-2 text-xs text-green-600/70 flex justify-between">
          <span>CONNECTED TO: DIJIANG-1</span>
          <span>MEMORY USAGE: 87%</span>
          <span>SYSTEM ID: DN-45X</span>
        </div>
      </div>
      
      {/* Global CSS for custom animations and effects */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        
        @keyframes dataline {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        
        @keyframes noise {
          0%, 100% { background-position: 0 0; }
          10% { background-position: -5% -10%; }
          30% { background-position: 3% -15%; }
          50% { background-position: 12% 5%; }
          70% { background-position: -9% 10%; }
          90% { background-position: 5% -5%; }
        }
        
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        
        .scan-line {
          animation: scanline 8s linear infinite;
        }
        
        .data-line {
          animation: dataline 15s linear infinite;
        }
        
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          animation: noise 1s steps(2) infinite;
        }
        
        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thumb-green-700::-webkit-scrollbar-thumb {
          background-color: rgba(4, 120, 87, 0.5);
          border-radius: 3px;
        }
        
        .scrollbar-track-black\/30::-webkit-scrollbar-track {
          background-color: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
