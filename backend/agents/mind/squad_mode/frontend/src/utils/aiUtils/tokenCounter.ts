// Simple token counter - roughly 4 characters per token
export const countTokens = (text: string): number => {
  if (!text) return 0;
  // Remove whitespace and count characters
  const cleanedText = text.replace(/\s+/g, '');
  // Rough estimate: 4 characters ≈ 1 token
  return Math.ceil(cleanedText.length / 4);
};

// Calculate total tokens for multiple files
export const calculateTotalTokens = (files: Array<{ content?: string }>): number => {
  return files.reduce((total, file) => {
    return total + countTokens(file.content || '');
  }, 0);
};

// Format token count with commas
export const formatTokenCount = (count: number): string => {
  return count.toLocaleString();
};

// Check if token count exceeds limit
export const isTokenLimitExceeded = (count: number, limit: number = 4000000): boolean => {
  return count > limit;
}; 