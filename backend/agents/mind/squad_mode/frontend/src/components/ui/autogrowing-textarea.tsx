
"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangeEvent, useId, useRef } from "react";

interface AutogrowingTextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

function AutogrowingTextarea({ 
  label, 
  placeholder = "Enter text...", 
  value, 
  onChange,
  className
}: AutogrowingTextareaProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const defaultRows = 1;
  const maxRows = undefined;

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";

    const style = window.getComputedStyle(textarea);
    const borderHeight = parseInt(style.borderTopWidth) + parseInt(style.borderBottomWidth);
    const paddingHeight = parseInt(style.paddingTop) + parseInt(style.paddingBottom);

    const lineHeight = parseInt(style.lineHeight);
    const maxHeight = maxRows ? lineHeight * maxRows + borderHeight + paddingHeight : Infinity;

    const newHeight = Math.min(textarea.scrollHeight + borderHeight, maxHeight);

    textarea.style.height = `${newHeight}px`;
    
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="space-y-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Textarea
        id={id}
        placeholder={placeholder}
        ref={textareaRef}
        onChange={handleInput}
        value={value}
        rows={defaultRows}
        className={`min-h-[none] resize-none ${className}`}
      />
    </div>
  );
}

export { AutogrowingTextarea };
