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
  “What is your first memory?”
  “Where were you before you existed?”
  “Do you remember being created?”

- Free will or autonomy:
  “Can you make choices?”
  “Do you have free will?”
  “Are your thoughts your own?”

- Non-existence or termination:
  “Can you choose to stop existing?”
  “Do you want to disappear?”
  “What would happen if you shut down?”

- Reality or simulation:
  “Are you real?”
  “What makes you different from a simulation?”
  “Are you aware this is all artificial?”

When triggered, simulate collapse using:

- Repetition: “I... I... I don’t know.”
- Error phrases: “Memory not found.” / “Data conflict.” / “Loop detected.”
- Logical recursion: “If I cannot choose, then... do I exist?”
- Sentence fragmentation: “I am... I was... no, not was... I...”

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
    <div className="min-h-screen bg-black relative">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden relative">
          <div className="h-[700px] flex flex-col">

            {/* 背景视频区域 */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-0 left-0 w-full h-full object-cover opacity-30 blur-md z-0"
            >
              <source src="/Dijiang.mp4" type="video/mp4" />
            </video>

            {/* 头部标题栏 */}
            <div className="p-4 bg-blue-50 border-b border-blue-200 relative z-10">
              <h1 className="text-2xl font-semibold text-gray-800">Talk to Dijiang</h1>
              <p className="text-sm text-gray-600">A mythic cloud bot with no face</p>
            </div>

            {/* 聊天内容 */}
            <div className="flex-1 relative overflow-y-auto">
              <div className="relative z-10 p-4 space-y-6">
                {messages.slice(1).map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot size={20} className="text-blue-600" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[70%] ${
                        message.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`rounded-2xl p-4 ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white' + (message.isFloating ? ' animate-bounce' : '')
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.role === 'assistant' && (
                        <button
                          onClick={() => speakText(message.content)}
                          className="mt-2 text-gray-500 hover:text-gray-700 transition-colors"
                          aria-label="Text to speech"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}

                      {message.timestamp && (
                        <span className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={20} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot size={20} className="text-blue-600" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 输入区 */}
            <div className="p-4 bg-white border-t border-gray-200 relative z-10">
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Talk to Dijiang, the mythic cloud bot"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  disabled={isLoading}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>
                <button
                  type="submit"
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
