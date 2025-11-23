import React, { useMemo, useState } from 'react';
import { Message, Role } from '../types';
import { Bot, User, Sparkles, Copy, Check, Volume2, RotateCw, Pencil, X, Save } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onSuggestionClick?: (text: string) => void;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLast,
  onSuggestionClick,
  onRegenerate,
  onEdit
}) => {
  const isUser = message.role === Role.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Extract suggestions from content
  const { displayContent, suggestions } = useMemo(() => {
    if (isUser) return { displayContent: message.content, suggestions: [] };

    const suggestionRegex = /<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/;
    const match = message.content.match(suggestionRegex);
    
    if (match) {
      try {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);
        const cleanText = message.content.replace(match[0], '').trim();
        return { displayContent: cleanText, suggestions: Array.isArray(parsed) ? parsed : [] };
      } catch (e) {
        return { displayContent: message.content, suggestions: [] };
      }
    }

    let cleanText = message.content;
    if (message.isStreaming) {
        const partialRegex = /<<<SUGGESTIONS:?/;
        if (partialRegex.test(cleanText)) {
            cleanText = cleanText.split('<<<SUGGESTIONS')[0].trim();
        }
    }

    return { displayContent: cleanText, suggestions: [] };
  }, [message.content, isUser, message.isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(displayContent);
    utterance.lang = 'zh-CN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.cancel(); // Cancel previous
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit?.(editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-1 transition-transform group-hover:scale-105 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Content Container */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
            {/* Bubble */}
            <div className={`px-4 py-3 shadow-sm w-full relative transition-all duration-200 ${
              isUser 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
            } ${isEditing ? 'ring-2 ring-indigo-300' : ''}`}>
              
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded p-2 text-sm focus:outline-none resize-none"
                    rows={Math.min(10, Math.max(2, editContent.split('\n').length))}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-white/20 rounded text-xs flex items-center gap-1">
                      <X size={12} /> 取消
                    </button>
                    <button onClick={handleSaveEdit} className="p-1 bg-white text-indigo-600 rounded text-xs font-bold flex items-center gap-1 px-2 hover:bg-gray-100">
                      <Save size={12} /> 保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayContent}</p>
                  ) : (
                    <MarkdownRenderer content={displayContent} />
                  )}
                  
                  {message.isStreaming && message.role === Role.MODEL && (
                      <span className="inline-block w-2 h-4 ml-1 align-middle bg-emerald-500 animate-pulse"></span>
                  )}
                </>
              )}
            </div>
            
            {/* Interactive Toolbar */}
            {!isEditing && !message.isStreaming && (
              <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Copy */}
                <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors" title="复制">
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>

                {/* Speak (Only for AI or User text) */}
                <button onClick={handleSpeak} className={`p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors ${isSpeaking ? 'text-indigo-500 bg-indigo-50' : ''}`} title="朗读">
                  <Volume2 size={14} className={isSpeaking ? "animate-pulse" : ""} />
                </button>

                {/* Edit (Only for User) */}
                {isUser && onEdit && (
                  <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors" title="编辑">
                    <Pencil size={14} />
                  </button>
                )}

                {/* Regenerate (Only for Last AI Message) */}
                {!isUser && isLast && onRegenerate && (
                   <button onClick={onRegenerate} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors" title="重新生成">
                     <RotateCw size={14} />
                   </button>
                )}
                
                <span className="text-[10px] text-gray-300 mx-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            
            {/* Suggestions Chips */}
            {!isUser && suggestions.length > 0 && !isEditing && (
                <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSuggestionClick?.(suggestion)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-100 hover:border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full text-xs font-medium transition-all shadow-sm active:scale-95"
                        >
                            <Sparkles size={12} className="text-emerald-500" />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};