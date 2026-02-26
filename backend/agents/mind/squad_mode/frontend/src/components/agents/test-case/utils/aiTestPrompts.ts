// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/test-generation/
// Update this file to fetch prompts from backend API endpoints

import { TestCase } from '../types';

export const getTestGenerationPrompt = async (
  testType: string,
  functionName: string,
  language: string,
  code: string
): Promise<{ systemPrompt: string; userPrompt: string }> => {
  // system prompt comes from backend via requestType 'test-generation'
  // user prompt is built by backend promptTemplates
  const res = await fetch('/api/prompts/test-generation/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'getTestGenerationPrompt', params: [testType, functionName, language, code] })
  });
  const data = await res.json();
  if (!res.ok || !data?.prompt) {
    throw new Error(data?.message || 'Failed to build test generation prompt');
  }
  return { systemPrompt: '', userPrompt: data.prompt as string };
};

export const parseTestResponse = (testType: string, response: string): TestCase => {
  // Let the UI use raw response as code. Parsing strategies can be added later
  return {
    id: 0,
    name: `${testType} Test`,
    type: `${testType} Case` as any,
    code: response,
    description: `Auto-generated ${testType} tests`
  };
}; 