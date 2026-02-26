/**
 * API Prompt Templates
 * Contains prompt templates for API-related operations
 */

const getApiPlanPrompt = (description, fileContent = null) => {
  let prompt = `Create a detailed API plan based on the following requirements:\n\n${description}`;
  
  if (fileContent) {
    prompt += `\n\nConsider this existing code as context:\n${fileContent}`;
  }
  
  prompt += `\n\nProvide a complete API plan that includes:
- Overview with purpose, tech stack, and architecture
- Detailed endpoint specifications with parameters, security, and responses
- Data models with schemas and relationships
- Implementation details including setup, authentication, middleware, and routes
- Security measures and best practices
- Deployment configuration and infrastructure requirements

Ensure the response follows the exact JSON structure specified in the system instruction.`;

  return prompt;
};

module.exports = {
  getApiPlanPrompt
};
