/**
 * Document Generation Prompt Templates
 * Contains prompt templates for document generation operations
 */

const buildBusinessDocumentPrompt = (repositoryContext) => {
  return `
Generate a comprehensive Business Requirements Document (BRD) for this repository.

REPOSITORY ANALYSIS:
- Summary: ${repositoryContext.summary}
- Tech Stack: ${repositoryContext.techStack.join(', ')}
- Key Features: ${repositoryContext.keyFeatures.join(', ')}
- Architecture: ${repositoryContext.architecture}
- Business Value: ${repositoryContext.businessValue}

FILE STRUCTURE:
${Object.entries(repositoryContext.fileMap).slice(0, 30).map(([path, analysis]) => 
  `${path}: ${analysis.purpose} (${analysis.category})`
).join('\n')}

BUSINESS ANALYSIS REQUIREMENTS:
1. Extract business domain and value proposition from the codebase
2. Identify user personas and their journey through the application
3. Understand business workflows and processes represented in the code
4. Analyze data models for business entities and relationships
5. Identify revenue streams and business model implications
6. Assess competitive advantages and market positioning
7. Determine scalability requirements and growth projections
8. Evaluate security and compliance needs
9. Identify integration touchpoints with external systems

Create a comprehensive Business Requirements Document that focuses on business value, user needs, and functional requirements rather than technical details. Use clear, non-technical language that stakeholders can understand.
`;
};

const buildTechnicalDocumentPrompt = (repositoryContext) => {
  return `
Generate comprehensive technical overview document for this repository.

REPOSITORY ANALYSIS:
- Summary: ${repositoryContext.summary}
- Tech Stack: ${repositoryContext.techStack.join(', ')}
- Key Features: ${repositoryContext.keyFeatures.join(', ')}
- Architecture: ${repositoryContext.architecture}
- Business Value: ${repositoryContext.businessValue}

FILE STRUCTURE:
${Object.entries(repositoryContext.fileMap).slice(0, 30).map(([path, analysis]) => 
  `${path}: ${analysis.purpose} (${analysis.category})`
).join('\n')}

technical overview document REQUIREMENTS:
1. Deep code structure and architectural pattern analysis
2. Framework and library usage with version dependencies
3. Database design, relationships, and optimization strategies
4. API design patterns and integration approaches
5. Security implementation including authentication, authorization, and data protection
6. Performance bottlenecks identification and optimization recommendations
7. Error handling, logging, and monitoring implementations
8. Testing strategies including unit, integration, and end-to-end testing
9. Deployment automation and CI/CD pipeline analysis
10. Configuration management and environment-specific settings
11. Scalability considerations and horizontal/vertical scaling options
12. Code quality metrics and technical debt assessment

Create detailed technical overview document that enables developers, DevOps engineers, and technical stakeholders to understand, maintain, and extend the system.
`;
};

const buildCodeQualityCompletenessPrompt = (repositoryContext) => {
  return `
Perform a comprehensive code completeness check for this repository.

REPOSITORY ANALYSIS:
- Summary: ${repositoryContext.summary}
- Tech Stack: ${repositoryContext.techStack.join(', ')}
- Key Features: ${repositoryContext.keyFeatures.join(', ')}
- Architecture: ${repositoryContext.architecture}
- Business Value: ${repositoryContext.businessValue}

FILE STRUCTURE:
${Object.entries(repositoryContext.fileMap).slice(0, 30).map(([path, analysis]) => 
  `${path}: ${analysis.purpose} (${analysis.category})`
).join('\n')}

COMPLETENESS ASSESSMENT REQUIREMENTS:
1. Analyze the codebase to extract both business and technical aspects
2. Compare business requirements implied by the code with technical implementation
3. Identify gaps, missing features, edge cases, and completeness issues
4. Provide actionable recommendations for improvement with specific implementation guidance
5. Focus on quality, completeness, and alignment between business needs and technical delivery

EVALUATION DIMENSIONS:
- Feature completeness against business requirements with detailed gap analysis
- Security implementation gaps with specific vulnerability identification
- Performance bottlenecks with quantitative analysis and optimization recommendations
- Testing coverage gaps 
- User experience gaps with usability improvement recommendations
- Integration reliability with failure scenario analysis
- Monitoring and observability coverage with specific metric recommendations
- Data quality and validation with comprehensive data governance suggestions

Provide a comprehensive quality assessment with actionable recommendations categorized by priority and impact.
`;
};

module.exports = {
  buildBusinessDocumentPrompt,
  buildTechnicalDocumentPrompt,
  buildCodeQualityCompletenessPrompt
};
