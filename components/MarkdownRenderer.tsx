import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-sm prose-slate max-w-none break-words dark:prose-invert">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />,
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [isCopied, setIsCopied] = useState(false);

            const handleCopy = () => {
              navigator.clipboard.writeText(codeString);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            };

            return !inline ? (
              <div className="group relative my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-gray-700/50 shadow-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700/50 text-xs text-gray-400">
                    <span className="font-mono">{match ? match[1] : 'code'}</span>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                      title="Copy code"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                 </div>
                 <div className="p-4 overflow-x-auto">
                    <code className={`${className} text-sm font-mono text-gray-200`} {...props}>
                      {children}
                    </code>
                 </div>
              </div>
            ) : (
              <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200/50" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};