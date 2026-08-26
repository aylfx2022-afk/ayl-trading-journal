import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, Hash, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  availableTags?: string[];
}

export default function TagInput({ tags, onChange, placeholder = "Add tag...", availableTags = [] }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
      setShowPicker(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20 text-xs font-bold transition-all hover:bg-[#4d8fe0]/20"
          >
            <Hash size={12} className="opacity-50 text-[#4d8fe0]" />
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(index)}
              className="p-0.5 hover:bg-[#4d8fe0]/20 rounded-full transition-colors cursor-pointer text-[#7ba8e8]"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      
      <div className="relative group">
        <Hash 
          size={16} 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b93a1]/50 transition-colors group-focus-within:text-[#4d8fe0]" 
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowPicker(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowPicker(true)}
          placeholder={placeholder}
          className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#4d8fe0]/50 text-[#e8ebf2] text-sm placeholder:text-[#8b93a1]/40 transition-all"
        />
        {showPicker && availableTags.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-[#181d26] border border-white/10 rounded-xl shadow-xl p-2 max-h-40 overflow-y-auto">
            {availableTags.filter(t => t.toLowerCase().includes(inputValue.toLowerCase())).map(tag => (
              <button 
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full text-left px-3 py-2 text-sm text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/[0.06] rounded-lg cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#8b93a1]/70 px-1 font-medium">Press <span className="text-[#8b93a1]">Enter</span> or <span className="text-[#8b93a1]">comma</span> to add tags</p>
    </div>
  );
}
