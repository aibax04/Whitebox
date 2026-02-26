import { extractFunctionNames } from './functionExtractor';
import { getTestTemplates, generateGenericTestCases } from './testTemplates';
import { TestCase } from '../types';
//import { callGeminiApi } from '@/utils/aiUtils/geminiApi';

const TEST_GENERATION_SYSTEM_INSTRUCTION = `You are an expert software test engineer. Your task is to generate comprehensive test cases for the given function.
Follow these strict guidelines:
1. Generate test cases that cover all edge cases, error conditions, and normal operation
2. Include clear assertions and error messages
3. Follow the language's testing best practices and conventions
4. Ensure tests are deterministic and reproducible
5. Include proper setup and teardown if needed
6. Document test cases with clear descriptions
7. Use meaningful test data that demonstrates the function's behavior

Return the test cases in the following JSON format:
{
  "testCases": [
    {
      "id": number,
      "name": string,
      "type": string,
      "code": string,
      "description": string
    }
  ]
}`;

export const generateTestCasesForLanguage = async (
  fileContent: string | null, 
  fileName: string | null,
  fileLanguage: string
): Promise<TestCase[]> => {
  if (!fileContent) return [];
  const language = fileLanguage;
  const functionNames = extractFunctionNames(fileContent, language);
  const testCases: TestCase[] = [];

  for (let i = 0; i < Math.min(functionNames.length, 5); i++) {
    const fn = functionNames[i];
    const generatedTests = await generateTestsForFunction(fn, language, i + 1);
    testCases.push(...generatedTests);
  }

  if (testCases.length === 0) {
    testCases.push(...generateGenericTestCases(language, fileName));
  }
  return testCases;
};

export const generateTestsForFunction = async (
  functionName: string, 
  language: string, 
  id: number
): Promise<TestCase[]> => {
  const templates = getTestTemplates(language, functionName);
  const testTypes = ['positive', 'negative', 'edge', 'performance', 'concurrency'];
  const result: TestCase[] = [];

  const selectedTypes = testTypes.filter((_, index) => index === id % testTypes.length || index === (id + 2) % testTypes.length);
  
  for (const type of selectedTypes) {
    const testName = `Test ${functionName} ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    const testType = type.charAt(0).toUpperCase() + type.slice(1) + ' Case';
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please sign in to generate tests');
      }

      // Call backend endpoint which internally calls /api/generate
      const response = await fetch('/api/test-generation/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          functionName,
          language,
          testType: type,
          functionCode: templates[type as keyof typeof templates].code
        })
      });

      try {
        const data = await response.json();
        const parsedResponse = typeof data.content === 'string' ? JSON.parse(data.content) : data;
        if (parsedResponse.testCases && Array.isArray(parsedResponse.testCases)) {
          result.push(...parsedResponse.testCases);
        } else {
          // Fallback to template if AI response is invalid
          result.push({
            id: result.length + 1,
            name: testName,
            type: testType,
            code: templates[type as keyof typeof templates].code,
            description: templates[type as keyof typeof templates].description
          });
        }
      } catch (parseError) {
        // Fallback to template if parsing fails
        result.push({
          id: result.length + 1,
          name: testName,
          type: testType,
          code: templates[type as keyof typeof templates].code,
          description: templates[type as keyof typeof templates].description
        });
      }
    } catch (error) {
      // Fallback to template if AI call fails
      result.push({
        id: result.length + 1,
        name: testName,
        type: testType,
        code: templates[type as keyof typeof templates].code,
        description: templates[type as keyof typeof templates].description
      });
    }
  }
  return result;
};

export const getRandomFailureReason = (testType: string): string => {
  const failures: Record<string, string[]> = {
    'Positive Case': ["Assertion failed: Expected 'expected_output', got 'actual_output'", "Function returned null", "Expected true but got false"],
    'Edge Case': ["Function threw unexpected exception", "Empty input handling failed", "Boundary condition not handled correctly"],
    'Exception Handling': ["Expected exception not thrown", "Wrong exception type thrown", "Exception message doesn't match expected pattern"],
    'Performance': ["Execution time exceeded threshold", "Memory usage too high", "Operation timed out"],
    'Concurrency': ["Race condition detected", "Thread deadlock occurred", "Concurrent modification exception"]
  };
  const failureCategory = failures[testType as keyof typeof failures] || failures['Positive Case'];
  return failureCategory[Math.floor(Math.random() * failureCategory.length)];
};
