// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/code-completion/
// Update this file to fetch prompts from backend API endpoints

import { toast } from "sonner";
//import { callGeminiApi } from "./geminiApi";

/**
 * Get code completions from Gemini
 */
export const getCodeCompletion = async (
  prompt: string,
  language: string,
  maxTokens: number = 1500
): Promise<string> => {

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in for code completion');
    }

    const completion = await fetch('/api/code-completion/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt,
        language,
        maxOutputTokens: maxTokens,
        temperature: 0.1,
        stopSequences: ["```", "\n\n"]
      })
    });

    const data = await completion.json();
    return typeof data.content === 'string' ? data.content.trim() : '';
  } catch (error) {
    console.error("Code completion error:", error);
    toast.error("Code completion failed", {
      description: error instanceof Error ? error.message : "Failed to get code completion"
    });
    throw error;
  }
};

// For backward compatibility
export const codeCompletion = getCodeCompletion;
