import React, { useState, KeyboardEvent } from 'react';
import { X, Hash, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold transition-all hover:bg-emerald-500/20"
          >
            <Hash size={12} className="opacity-50" />
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(index)}
              className="p-0.5 hover:bg-emerald-500/20 rounded-full transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      
      <div className="relative group">
        <Hash 
          size={16} 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-emerald-500/50" 
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm placeholder:text-zinc-700 transition-all"
        />
      </div>
      <p className="text-[10px] text-zinc-600 px-1 font-medium">Press <span className="text-zinc-500">Enter</span> or <span className="text-zinc-500">comma</span> to add tags</p>
    </div>
  );
}
