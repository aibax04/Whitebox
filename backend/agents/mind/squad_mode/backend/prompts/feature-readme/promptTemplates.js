/**
 * Feature README Prompt Templates
 * Contains prompt templates for Feature README generation operations
 */

/**
 * Build the prompt for generating a Feature README
 * @param {string} repoUrl - Repository URL
 * @param {Array} repoContext - Repository context with file information
 * @returns {string} - Formatted prompt
 */
const buildFeatureReadmePrompt = (repoUrl, repoContext) => {
  return `You are an expert technical documentation specialist. Generate a comprehensive, professional Feature README.md file for this repository. Analyze the provided codebase context thoroughly and create documentation that matches the quality of major open-source projects.

MANDATORY SECTIONS (must be included in this exact order):

1. **Project Title and Description**
   - Use a clear, concise project title as the main heading (# Project Name)
   - Write a 2-3 sentence overview describing what the project does and its primary purpose
   - Highlight the main value proposition and target audience

2. **Features**
   - Create a numbered list of ALL features found in the codebase
   - Each feature should use the format: "### 1. Feature Name" followed by 1-2 lines of description
   - Analyze routes, components, pages, services, and API endpoints to identify features
   - Be comprehensive - include both major and minor features
   - Number features sequentially (1, 2, 3, etc.)
   - Each description should clearly explain what the feature does

3. **Deployment**
   - ONLY document what is actually present in the repository
   - Start with an "Architecture" subsection (### Architecture) ONLY if architecture information is found in the codebase:
     * Document backend technology stack and port information ONLY if found in code or config files
     * Document frontend technology stack and build output ONLY if found in code or config files
     * Document database systems ONLY if found in code, config files, or dependencies
     * Document external services and dependencies ONLY if found in code or config files
     * Document infrastructure components (Docker, containers, etc.) ONLY if corresponding files exist
   - Include a "Deployment Instructions" subsection (### Deployment Instructions) ONLY if deployment files or scripts are found:
     * Document prerequisites ONLY if listed in actual documentation or config files
     * Document backend deployment steps ONLY if deployment scripts or instructions exist in the repository
     * Document frontend deployment steps ONLY if deployment scripts or instructions exist in the repository
     * Document database setup ONLY if database setup scripts or instructions exist
     * Document Docker/Container setup ONLY if Dockerfile, docker-compose.yml, or container configs exist
   - Analyze deployment configuration files (Dockerfile, docker-compose.yml, CI/CD configs, package.json scripts)
   - Provide ONLY the specific commands and configurations that are actually present in the repository
   - Include ONLY actual file paths and directory structures that exist in the repository
   - Do NOT add any recommendations, suggestions, or generic deployment instructions
   - Do NOT mention hosting platforms or deployment services unless they are explicitly referenced in the codebase

4. **Credentials**
   - Start with a brief paragraph explaining where credentials are stored (e.g., .env files, excluded from version control via .gitignore)
   - Create "Backend Credentials" subsection (### Backend Credentials) with:
     * List ALL environment variables found in the codebase
     * Format: \`VARIABLE_NAME\` - Description of what it's used for
   - Create "Frontend Credentials" subsection (### Frontend Credentials) with:
     * List ALL environment variables found in frontend code
     * Format: \`VITE_VARIABLE_NAME\` - Description of what it's used for
   - Analyze .env.example files, config files, and code references (process.env, import.meta.env) to identify all required credentials

5. **Clients**
   - Identify which client(s) or organization(s) are using this application ONLY if explicitly found in the codebase
   - Look for client-specific code, configuration files, or documentation references
   - If no specific clients are found in the repository, do NOT add any assumptions or generic statements
   - Include client-specific deployment or configuration notes ONLY if they exist in the repository

Repository URL: ${repoUrl || 'N/A'}
Repository Context: ${JSON.stringify(repoContext, null, 2)}

ANALYSIS REQUIREMENTS:
Thoroughly analyze the provided repository context to identify ONLY what is actually present:
- All features by examining route files, component files, page files, service files, and API endpoint definitions
- Deployment configuration files ONLY if they exist (Dockerfile, docker-compose.yml, CI/CD configs like .github/workflows, deployment scripts, package.json scripts)
- Configuration files ONLY if they exist (.env.example, config files, environment variable references using process.env or import.meta.env)
- Client-specific indicators ONLY if found (hardcoded client names, organization references, tenant configurations, client-specific environment variables)
- Technology stack from actual package.json, requirements.txt, package-lock.json, and import/require statements
- Architecture patterns from actual code structure, directory organization, and configuration files

CRITICAL: Document ONLY what exists in the repository. Do NOT add recommendations, suggestions, generic examples, or assumptions. Do NOT mention hosting platforms, deployment services, or technologies unless they are explicitly referenced in the codebase.

OUTPUT FORMATTING REQUIREMENTS:
- Use proper markdown syntax with clear hierarchy:
  * # for main title
  * ## for main sections (Features, Deployment, Credentials, Clients)
  * ### for subsections (Architecture, Deployment Instructions, Backend Credentials, etc.)
- Use numbered feature format: ### 1. Feature Name (not ### Feature 1 or ### Feature Name 1)
- Use code blocks with language identifiers for all commands: \`\`\`bash, \`\`\`javascript, \`\`\`json, etc.
- Use bullet points (-) consistently for lists within sections
- Use inline code formatting (\`code\`) for variable names, file paths, and technical terms
- Use bold (**text**) only for emphasis on important terms or section labels
- Keep descriptions concise but informative (1-2 lines per feature)
- Ensure professional, polished formatting throughout
- Return ONLY the raw markdown content
- Do NOT wrap the output in markdown code blocks (\`\`\`markdown)
- Do NOT include meta-commentary like "Here is the README" or "Below is the content"
- Start directly with the title (# Project Name)

QUALITY STANDARDS:
- Professional documentation quality matching major open-source projects
- Comprehensive coverage of all features and deployment aspects that actually exist
- Document only what is present - do not create generic instructions or recommendations
- Well-organized structure with logical flow and proper markdown hierarchy
- Detailed enough to be useful, but not overly verbose
- Accurate information based ONLY on actual codebase analysis from the provided context
- All technical details must be factually correct and present in the repository
- Do NOT add any recommendations, suggestions, or generic content

CRITICAL: Generate a complete, production-ready README.md file. Start directly with the title and return only the markdown content without any wrappers or explanations.`;
};

/**
 * Build the prompt for applying AI changes to an existing Feature README
 * @param {string} userPrompt - User's request for changes
 * @param {string} currentContent - Current README content
 * @param {string} repoUrl - Repository URL
 * @param {Array} repoContext - Repository context with file information
 * @returns {string} - Formatted prompt
 */
const buildFeatureReadmeEditPrompt = (userPrompt, currentContent, repoUrl, repoContext) => {
  return `You are an expert technical documentation editor. Edit the existing Feature README.md file according to the user's request while maintaining professional documentation quality and consistency.

USER REQUEST:
${userPrompt}

CURRENT README CONTENT:
\`\`\`markdown
${currentContent}
\`\`\`

REPOSITORY CONTEXT:
Repository URL: ${repoUrl || 'N/A'}
${repoContext.length > 0 ? `Files and Context: ${JSON.stringify(repoContext, null, 2)}` : 'No additional context provided'}

EDITING REQUIREMENTS:

1. **Understand the Request**
   - Carefully analyze what the user wants to change, add, or remove
   - Determine if the change affects other sections and update them accordingly
   - Maintain consistency with existing formatting, style, and tone
   - Preserve the overall structure and organization

2. **Preserve Required Sections**
   - Ensure all mandatory sections remain unless explicitly removed by user:
     * Project Title and Description
     * Features (numbered list with 1-2 line descriptions, format: ### 1. Feature Name)
     * Deployment (with Architecture and Deployment Instructions subsections)
     * Clients
   - Only remove sections if the user explicitly requests removal
   - If adding new sections, ensure they follow the same formatting standards

3. **Maintain Quality Standards**
   - Keep the same professional documentation quality as the original
   - Maintain consistent formatting and structure throughout
   - Preserve the level of detail and comprehensiveness
   - Ensure all technical information remains accurate based on repository context
   - Match the writing style and tone of the existing content

4. **Update Related Content**
   - If adding a feature, ensure it follows the numbered format (### N. Feature Name) and maintains sequential numbering
   - If modifying deployment, update ONLY with information that exists in the repository - do not add recommendations
   - If changing credentials, update all relevant references and maintain the same format
   - If updating clients, maintain the same format and structure, but only document what exists in the repository
   - If removing content, ensure no broken references or incomplete sections remain
   - Do NOT add any recommendations, suggestions, or generic content

5. **Formatting Consistency**
   - Use proper markdown hierarchy:
     * # for main title
     * ## for main sections
     * ### for subsections
   - Use numbered feature format: ### 1. Feature Name (not ### Feature 1)
   - Use code blocks with language identifiers for commands: \`\`\`bash, \`\`\`javascript, etc.
   - Use inline code formatting (\`code\`) for variable names, file paths, and technical terms
   - Use bullet points (-) consistently for lists within sections
   - Use bold (**text**) only for emphasis on important terms
   - Maintain consistent spacing, indentation, and structure

6. **Content Quality**
   - Keep descriptions concise but informative (1-2 lines per feature)
   - Ensure all instructions are clear and actionable
   - Maintain professional tone throughout
   - Verify technical accuracy based on repository context
   - Ensure all code examples and commands are correct and functional

OUTPUT REQUIREMENTS:
- Return ONLY the complete updated markdown content
- Do NOT include any explanations, meta-commentary, or code block wrappers
- Do NOT include phrases like "Here is the updated README" or "Below is the content"
- Do NOT wrap the output in markdown code blocks (\`\`\`markdown)
- Start directly with the title (# Project Name) and content
- Ensure the output is a complete, valid README.md file
- Maintain all required sections unless explicitly removed by user request
- Preserve the quality, structure, and formatting style of the original README

CRITICAL: Apply the user's requested changes while maintaining all quality standards, required sections, and professional formatting. Return only the raw markdown content starting with the title.`;
};

module.exports = {
  buildFeatureReadmePrompt,
  buildFeatureReadmeEditPrompt
};

