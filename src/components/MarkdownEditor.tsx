import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, List, ListOrdered, Link, Quote, Code, Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = '128px' }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    if (mode === 'write') {
      adjustHeight();
    }
  }, [value, mode]);

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    onChange(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const { selectionStart } = e.currentTarget;
      const textBeforeCursor = value.substring(0, selectionStart);
      const lastLine = textBeforeCursor.split('\n').pop() || '';

      // Check for bullet list
      const bulletMatch = lastLine.match(/^(\s*)-\s/);
      // Check for numbered list
      const numberedMatch = lastLine.match(/^(\s*)(\d+)\.\s/);

      if (bulletMatch) {
        e.preventDefault();
        const prefix = bulletMatch[1] + '- ';
        const newValue = value.substring(0, selectionStart) + '\n' + prefix + value.substring(selectionStart);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(selectionStart + prefix.length + 1, selectionStart + prefix.length + 1);
          }
        }, 0);
      } else if (numberedMatch) {
        e.preventDefault();
        const indent = numberedMatch[1];
        const nextNumber = parseInt(numberedMatch[2], 10) + 1;
        const prefix = `${indent}${nextNumber}. `;
        const newValue = value.substring(0, selectionStart) + '\n' + prefix + value.substring(selectionStart);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(selectionStart + prefix.length + 1, selectionStart + prefix.length + 1);
          }
        }, 0);
      }
    }
  };

  const toolbarActions = [
    { icon: <Bold size={16} />, action: () => insertText('**', '**'), label: 'Bold' },
    { icon: <Italic size={16} />, action: () => insertText('_', '_'), label: 'Italic' },
    { icon: <List size={16} />, action: () => insertText('\n- ', ''), label: 'Bullet List' },
    { icon: <ListOrdered size={16} />, action: () => insertText('\n1. ', ''), label: 'Numbered List' },
    { icon: <Quote size={16} />, action: () => insertText('\n> ', ''), label: 'Quote' },
  ];

  return (
    <div className="w-full border border-white/10 rounded-2xl bg-[#12161c] overflow-hidden focus-within:border-[#4d8fe0]/40 transition-all">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 bg-[#181d26]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'write' ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20' : 'text-[#8b93a1] hover:text-[#e8ebf2]'
            }`}
          >
            <Edit3 size={14} />
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'preview' ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20' : 'text-[#8b93a1] hover:text-[#e8ebf2]'
            }`}
          >
            <Eye size={14} />
            Preview
          </button>
        </div>

        {mode === 'write' && (
          <div className="flex items-center gap-0.5 px-2">
            {toolbarActions.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={item.action}
                title={item.label}
                className="p-1.5 text-[#8b93a1] hover:text-[#4d8fe0] hover:bg-white/5 rounded-md transition-all cursor-pointer"
              >
                {item.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="relative">
        {mode === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-4 bg-transparent outline-none text-[#e8ebf2] text-sm placeholder:text-[#8b93a1]/40 resize-none overflow-hidden"
            style={{ minHeight }}
          />
        ) : (
          <div 
            className="w-full p-4 text-[#e8ebf2] text-sm prose prose-invert max-w-none overflow-auto"
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <span className="text-[#8b93a1]/50 italic">Nothing to preview</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
