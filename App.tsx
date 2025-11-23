import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from './services/geminiService';
import { Message, Role } from './types';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { Sparkles, Trash2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopGeneration = useRef<boolean>(false);

  // Initialize chat on mount
  useEffect(() => {
    geminiService.startChat();
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleClearChat = () => {
    if (window.confirm("确定要清除所有对话历史吗？")) {
      setMessages([]);
      geminiService.startChat();
      setError(null);
      window.speechSynthesis.cancel();
    }
  };

  const handleStop = () => {
    if (isLoading) {
      stopGeneration.current = true;
    }
  };

  const handleSendMessage = async (text: string, isRegenerate = false) => {
    stopGeneration.current = false;
    setError(null);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const userMessageId = Date.now().toString();

    // If not regenerating (normal send), add the user message
    if (!isRegenerate) {
        const userMessage: Message = {
            id: userMessageId,
            role: Role.USER,
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
    }

    // Add Placeholder AI Message
    const aiPlaceholderMessage: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      content: '', 
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiPlaceholderMessage]);

    try {
      let accumulatedText = "";
      
      const stream = geminiService.sendMessageStream(text);
      
      for await (const chunk of stream) {
        if (stopGeneration.current) {
            break;
        }
        accumulatedText += chunk;
        
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].id === aiMessageId) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: accumulatedText,
            };
          }
          return newMessages;
        });
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.findIndex(m => m.id === aiMessageId);
        if (lastIndex !== -1) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            isStreaming: false,
          };
        }
        return newMessages;
      });

    } catch (err: any) {
      console.error("Chat error:", err);
      setError("抱歉，遇到了一些问题，请稍后再试。");
      
      setMessages((prev) => prev.map(m => 
        m.id === aiMessageId ? { ...m, isStreaming: false, content: m.content || "⚠️ 生成失败" } : m
      ));
    } finally {
      setIsLoading(false);
      stopGeneration.current = false;
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;

    // Find the last user message to resend
    let lastUserMsgIndex = -1;
    let lastUserMsgContent = "";

    // We assume the structure is USER -> MODEL -> USER -> MODEL
    // If the last message is MODEL, we want to regenerate IT, using the previous USER message.
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg.role === Role.MODEL) {
        // Find the user message before this
        const prevMsg = messages[messages.length - 2];
        if (prevMsg && prevMsg.role === Role.USER) {
            lastUserMsgIndex = messages.length - 2;
            lastUserMsgContent = prevMsg.content;
        }
    }

    if (lastUserMsgIndex !== -1) {
        // Truncate history to BEFORE the last user message
        // Logic: The SDK needs the history *before* the new prompt we are about to send.
        // If we have [U1, M1, U2, M2] and we want to regenerate M2:
        // History passed to SDK should be [U1, M1].
        // Then we send U2 again.
        
        const newHistoryMessages = messages.slice(0, lastUserMsgIndex);
        
        // Map to Gemini History format
        const historyForSdk = newHistoryMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        // Reset Chat Session with this history
        geminiService.startChat(historyForSdk);

        // Update UI: Remove the last Model response, keep the User message (actually simpler to keep user message and just stream response)
        // Wait, handleSendMessage adds a NEW user message if !isRegenerate.
        // If isRegenerate, we assume the user message is already in UI, we just need to delete the bad AI response.
        
        setMessages(messages.slice(0, messages.length - 1)); // Remove failed/bad model response
        
        // Trigger send
        // Note: We need to pass isRegenerate=true so handleSendMessage doesn't append the user message again.
        handleSendMessage(lastUserMsgContent, true);
    }
  };

  const handleEdit = (msgId: string, newContent: string) => {
      // Find the message index
      const index = messages.findIndex(m => m.id === msgId);
      if (index === -1) return;

      // Ensure it is a user message
      if (messages[index].role !== Role.USER) return;

      // Logic:
      // 1. Slice messages up to this index (excluding this one because we will replace it)
      // 2. Restart chat with that history
      // 3. Send new content

      const previousMessages = messages.slice(0, index);
      
      const historyForSdk = previousMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      geminiService.startChat(historyForSdk);
      
      // Update UI: keep history, remove everything after (including the message being edited)
      setMessages(previousMessages); // User message will be re-added by handleSendMessage
      
      handleSendMessage(newContent, false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[100px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-emerald-200/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[0%] right-[0%] w-[30%] h-[30%] bg-indigo-200/30 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 bg-white/70 backdrop-blur-md border-b border-gray-200 z-10 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white p-2 rounded-lg shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Gemini Chat</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-gray-500 font-medium">Flash 2.5 Active</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleClearChat}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="清空对话"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto z-0 px-4 pt-6 pb-4 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-[-50px] animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                 <Sparkles className="text-indigo-500" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">你好！我是 Gemini</h2>
              <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                我可以帮你回答问题、写代码、提供创意灵感。试着问我一些复杂的问题吧！
              </p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                 <button onClick={() => handleSendMessage("给我讲个有趣的科学事实", false)} className="p-3 bg-white/60 hover:bg-white border border-gray-200 rounded-xl text-xs text-left text-gray-600 hover:border-indigo-300 hover:shadow-sm transition-all">
                    🌍 给我讲个有趣的科学事实
                 </button>
                 <button onClick={() => handleSendMessage("用 Python 写一个贪吃蛇游戏", false)} className="p-3 bg-white/60 hover:bg-white border border-gray-200 rounded-xl text-xs text-left text-gray-600 hover:border-indigo-300 hover:shadow-sm transition-all">
                    🐍 用 Python 写一个贪吃蛇游戏
                 </button>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isLast={index === messages.length - 1}
              onSuggestionClick={(text) => handleSendMessage(text, false)}
              onRegenerate={handleRegenerate}
              onEdit={(newContent) => handleEdit(msg.id, newContent)}
            />
          ))}

          {error && (
            <div className="mx-auto my-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-2 text-sm max-w-md animate-in slide-in-from-bottom-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <ChatInput onSend={(text) => handleSendMessage(text, false)} onStop={handleStop} isLoading={isLoading} />
    </div>
  );
};

export default App;