import React, { useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Loader2, Send } from 'lucide-react';

interface PromptBarProps {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptBar({ onSubmit, loading = false, placeholder = "Beschrijf wat je wilt...", className }: PromptBarProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        className="min-h-[60px] resize-none"
        disabled={loading}
      />
      <Button 
        type="submit" 
        disabled={!prompt.trim() || loading}
        className="px-3"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}