import { ArrowLeft } from 'lucide-react';
import React from 'react';

export default function BackButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 text-squadrun-primary hover:text-squadrun-primary/80 font-semibold ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
      <span>Back</span>
    </button>
  );
}
