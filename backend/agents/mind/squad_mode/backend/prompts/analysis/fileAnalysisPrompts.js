/**
 * File Analysis Prompt Templates
 * Contains prompt templates for individual file analysis and context generation
 */

const buildFileAnalysisPrompt = (filePath, fileContent, fileType) => {
  return `
Analyze the following file and generate a concise context summary.

FILE PATH: ${filePath}
FILE TYPE: ${fileType}

FILE CONTENT:
${fileContent}

ANALYSIS REQUIREMENTS:
1. Identify the file's primary purpose and functionality
2. Extract key components, functions, classes, or modules
3. Identify dependencies and imports
4. Note any configuration settings or constants
5. Identify business logic or technical patterns
6. Extract any API endpoints, routes, or interfaces
7. Note any security considerations or authentication logic
8. Identify data models or schemas

OUTPUT FORMAT:
Provide a structured summary in the following JSON format:
{
  "purpose": "This file is designed to handle its primary functionality by defining the main workflow and responsibilities, ensuring smooth execution within the system. The key components include its main functions, classes, or modules, which form the backbone of its logic. It relies on dependencies provided by external libraries or modules that extend functionality and enable integration. The business logic enforces domain-specific rules and processes that the application requires. From a technical perspective, it applies design or architectural patterns such as modularization and abstraction to improve maintainability. If needed, the file defines APIs in the form of routes or interfaces for communication, and it uses structured data models or schemas to manage and persist information consistently. Security features such as validation, authentication, or authorization may be included to protect the workflow, while configuration values or environment-based constants help control its behavior. Overall, this file falls into the backend category of the system."
}

Keep the summary concise and to the point. I want the summary to be a brief description of the file's purpose and functionality.
`;
};

const buildContextAggregationPrompt = (fileContexts, documentType, repoUrl, embeddingsContext = null) => {
  // Import system instructions
  const systemInstructions = require('../document-generation/systemInstructions');
  
  // Map document type to appropriate system instruction
  let systemInstruction = '';
  let userPrompt = '';
  
  // Build embeddings context section if available
  let embeddingsSection = '';
  if (embeddingsContext && embeddingsContext.length > 0) {
    embeddingsSection = `

SEMANTICALLY RELEVANT CODE SECTIONS (from vector search):
${embeddingsContext.map((ctx, idx) => `
[${idx + 1}] File: ${ctx.path} (Relevance: ${ctx.relevance})
${ctx.content.substring(0, 2000)}${ctx.content.length > 2000 ? '...' : ''}
`).join('\n')}

These code sections were found using semantic search and are highly relevant to the document type. Use them to provide deeper context and ensure comprehensive coverage.
`;
  }
  
  switch (documentType.toLowerCase()) {
    case 'business-document':
    case 'business document':
    case 'business requirements document':
    case 'brd':
      systemInstruction = systemInstructions.BUSINESS_DOCUMENT_SYSTEM_INSTRUCTION;
      userPrompt = `
REPOSITORY URL: ${repoUrl}
DOCUMENT TYPE: Business Requirements Document

ANALYZED FILE CONTEXTS:
${JSON.stringify(fileContexts, null, 2)}
${embeddingsSection}

Please analyze the provided file contexts and semantically relevant code sections to generate a comprehensive Business Requirements Document following the system instructions. Focus on extracting business value, user needs, and functional requirements from the technical implementation.
`;
      break;
      
    case 'technical-document':
    case 'technical document':
    case 'technical specification':
    case 'technical doc':
      systemInstruction = systemInstructions.TECHNICAL_DOCUMENT_SYSTEM_INSTRUCTION;
      userPrompt = `
REPOSITORY URL: ${repoUrl}
DOCUMENT TYPE: Technical Document

ANALYZED FILE CONTEXTS:
${JSON.stringify(fileContexts, null, 2)}
${embeddingsSection}

Please analyze the provided file contexts and semantically relevant code sections to generate a comprehensive Technical Document following the system instructions. Focus on technical architecture, implementation details, and operational aspects.
`;
      break;
      
    case 'code-quality':
    case 'code quality':
    case 'code quality completeness':
    case 'quality assessment':
    case 'completeness check':
      systemInstruction = systemInstructions.CODE_QUALITY_COMPLETENESS_SYSTEM_INSTRUCTION;
      userPrompt = `
REPOSITORY URL: ${repoUrl}
DOCUMENT TYPE: Code Quality and Completeness Assessment

ANALYZED FILE CONTEXTS:
${JSON.stringify(fileContexts, null, 2)}
${embeddingsSection}

Please analyze the provided file contexts and semantically relevant code sections to generate a comprehensive Code Quality and Completeness Assessment following the system instructions. Focus on identifying gaps, missing features, and quality concerns.
`;
      break;
      
    default:
      // Fallback to business document if type is not recognized
      systemInstruction = systemInstructions.BUSINESS_DOCUMENT_SYSTEM_INSTRUCTION;
      userPrompt = `
REPOSITORY URL: ${repoUrl}
DOCUMENT TYPE: ${documentType}

ANALYZED FILE CONTEXTS:
${JSON.stringify(fileContexts, null, 2)}
${embeddingsSection}

Please analyze the provided file contexts and semantically relevant code sections to generate a comprehensive document following the system instructions.
`;
  }
  
  return {
    systemInstruction,
    userPrompt
  };
};

module.exports = {
  buildFileAnalysisPrompt,
  buildContextAggregationPrompt
};
