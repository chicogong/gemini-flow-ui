import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Mic, MicOff, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) {
        onStop();
        return;
    }
    if (!input.trim()) return;
    
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("抱歉，您的浏览器不支持语音输入功能。建议使用 Chrome 或 Edge 浏览器。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false; // Stop after one sentence for cleaner chat UX
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      // Build the transcript
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => {
            const newValue = prev + finalTranscript;
            return newValue;
        });
        // Scroll to bottom of textarea just in case
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }, 10);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="border-t border-gray-200 bg-white/80 backdrop-blur-md p-4 pb-6 sm:pb-8 w-full z-20">
      <div className="max-w-4xl mx-auto relative">
        <form onSubmit={handleSubmit} className={`relative flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-2 transition-all shadow-sm ${isListening ? 'ring-2 ring-red-500/50 border-red-500' : 'focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500'}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "正在聆听..." : "输入消息与 Gemini 聊天..."}
            rows={1}
            disabled={isLoading}
            autoFocus
            className="w-full bg-transparent border-0 focus:ring-0 resize-none py-3 px-3 text-gray-800 placeholder-gray-400 text-sm leading-relaxed max-h-[150px]"
          />
          
          <div className="flex gap-1">
             <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`p-2.5 rounded-xl flex-shrink-0 transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md'
                  : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }`}
              title="语音输入"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              type="submit"
              disabled={!input.trim() && !isLoading}
              className={`p-2.5 rounded-xl flex-shrink-0 transition-all duration-200 ${
                (input.trim() || isLoading)
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:scale-105 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Square size={20} fill="currentColor" />
              ) : (
                <SendHorizontal size={20} />
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
          由 Gemini 2.5 Flash 驱动
        </p>
      </div>
    </div>
  );
};