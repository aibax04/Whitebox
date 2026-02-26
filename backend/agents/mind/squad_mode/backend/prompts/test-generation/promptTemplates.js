/**
 * Test Generation Prompt Templates
 * Contains prompt templates for test generation operations
 */

const buildPositiveTestPrompt = (functionName, language, code) => {
  return `Generate positive test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing normal operation with valid inputs.`;
};

const buildNegativeTestPrompt = (functionName, language, code) => {
  return `Generate negative test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing error conditions and invalid inputs.`;
};

const buildEdgeCaseTestPrompt = (functionName, language, code) => {
  return `Generate edge case test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing edge cases and boundary conditions.`;
};

const buildPerformanceTestPrompt = (functionName, language, code) => {
  return `Generate performance test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing performance characteristics.`;
};

const buildIntegrationTestPrompt = (functionName, language, code) => {
  return `Generate integration test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing integration with other components.`;
};

const buildSecurityTestPrompt = (functionName, language, code) => {
  return `Generate security test cases for the following ${language} function:
\`\`\`${language}
${code}
\`\`\`
Function name: ${functionName}
Focus on testing security vulnerabilities.`;
};

const getTestGenerationPrompt = (testType, functionName, language, code) => {
  const promptBuilders = {
    positive: buildPositiveTestPrompt,
    negative: buildNegativeTestPrompt,
    edgeCase: buildEdgeCaseTestPrompt,
    performance: buildPerformanceTestPrompt,
    integration: buildIntegrationTestPrompt,
    security: buildSecurityTestPrompt
  };

  const builder = promptBuilders[testType];
  if (!builder) {
    throw new Error(`Unknown test type: ${testType}`);
  }

  return builder(functionName, language, code);
};

module.exports = {
  buildPositiveTestPrompt,
  buildNegativeTestPrompt,
  buildEdgeCaseTestPrompt,
  buildPerformanceTestPrompt,
  buildIntegrationTestPrompt,
  buildSecurityTestPrompt,
  getTestGenerationPrompt
};
