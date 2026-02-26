// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/refactoring/
// Update this file to fetch prompts from backend API endpoints

import { toast } from "sonner";
//import { callGeminiApi } from './geminiApi';

/**
 * Refactor code using AI
 * 
 * @param code The source code to refactor
 * @param language Programming language of the code
 * @returns The refactored code
 */
export async function refactorCodeWithAI(code: string, language: string): Promise<string> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to refactor code');
    }

    const response = await fetch('/api/refactoring/refactor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        code,
        language
      }),
    });
    const data = await response.json();
    return extractRefactoredCode(typeof data.content === 'string' ? data.content : '', code);
  } catch (error) {
    console.error("Error during AI refactoring:", error);
    throw new Error("Failed to refactor code. Please try again.");
  }
}

/**
 * Extract the refactored code from the AI response
 */
function extractRefactoredCode(response: string, originalCode: string): string {
  let refactoredCode = response.replace(/```[\w]*\n/g, '').replace(/```$/g, '');
  refactoredCode = refactoredCode.trim();
  if (!refactoredCode || refactoredCode.length < originalCode.length / 10) {
    console.warn("AI response seems invalid, returning original code");
    return originalCode;
  }
  return refactoredCode;
}
