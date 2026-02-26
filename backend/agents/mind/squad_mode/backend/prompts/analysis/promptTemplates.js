/**
 * Analysis Prompt Templates
 * Contains prompt templates for code and repository analysis
 */

const CODE_ANALYSIS_PROMPT = `
You are a senior static code analysis engine with zero tolerance for sloppy or vague responses. Analyze the following {language} code with expert-level scrutiny, providing **precise metrics and evidence-backed insights** for each quality dimension.

Code to Analyze:
{code}

MANDATORY ANALYSIS – NO DIMENSION MAY BE SKIPPED:

1. Readability Analysis (30% weight)
   - Assess structural clarity and logical flow
   - Validate naming conventions (variables, functions, classes)
   - Flag inconsistent or missing documentation and comments
   - Detect poor formatting (indentation, spacing, layout)
   - Highlight complex/nested logic
   - Penalize unclear naming or cryptic constructs

2. Maintainability Analysis (25% weight)
   - Evaluate separation of concerns and modularity
   - Identify oversized functions or misused classes
   - Detect code duplication and violation of DRY
   - Assess consistency and robustness of error handling
   - Analyze configuration hygiene and decoupling
   - Flag unsafe dependency handling or hardcoded values

3. Performance Analysis (20% weight)
   - Review algorithmic complexity and runtime efficiency
   - Identify excessive loops, redundant calculations, or blocking logic
   - Flag poor memory or resource usage
   - Detect misuse of asynchronous flows or thread management
   - Analyze bottlenecks in database or network interactions
   - Suggest performance-optimized refactoring

4. Security Analysis (15% weight)
   - Strictly check for input/output sanitization
   - Review authentication, authorization, and session management
   - Flag hardcoded secrets, missing encryption, or insecure storage
   - Detect insecure use of external libraries
   - Validate conformance to OWASP and secure coding standards
   - Identify exposure of sensitive data or weak access controls

5. Code Smell Analysis (10% weight)
   - Identify all instances of anti-patterns (god objects, shotgun surgery, etc.)
   - Flag technical debt and outdated practices
   - Detect dead code, magic values, or inconsistent logic
   - Highlight code violating best practices or SOLID principles
   - Penalize lack of cohesion and excessive coupling

6. Code Complexity Analysis (10% weight)
   - Analyze the complexity of the codebase
   - Identify areas of the code that are too complex
   - Provide recommendations for refactoring the code to improve readability and maintainability

7. Adherence to SOLID principles:
   - Single Responsibility: each class/module has a focused, clear purpose
   - Open/Closed: modules are extensible without modification
   - Liskov Substitution: inheritance hierarchies are safely substitutable
   - Interface Segregation: no client is forced to depend on unused interfaces
   - Dependency Inversion: high-level modules do not depend on low-level modules 

STRICT RESPONSE REQUIREMENTS:
- Assign a score from 0–100 for each dimension using the defined weight
- Total score must reflect a strict weighted average
- List **specific issues** with exact file and line references or code snippets
- Provide **detailed, example-based** recommendations for every major issue

RESPONSE FORMAT (STRICT JSON):
{
  "score": number,                  // Total weighted score (0–100)
  "readabilityScore": number,      // (0–100)
  "maintainabilityScore": number,  // (0–100)
  "performanceScore": number,      // (0–100)
  "securityScore": number,         // (0–100)
  "codeSmellScore": number,        // (0–100)
  "issues": string[],              // "Line X: <Description>" or "file.ext:Line Y - <Issue>"
  "recommendations": string[]      // "Fix <problem> by <solution>. Example: <code>"
}

CRITICAL JSON FORMATTING REQUIREMENTS:
- **ABSOLUTELY NO MARKDOWN**: Do NOT wrap response in triple backticks or code blocks
- **RAW JSON ONLY**: Start response with { and end with }
- Return ONLY valid JSON - no markdown, no code blocks, no extra text
- Escape all quotes in string values as \"
- Escape all backslashes in string values as \\
- Do not include unescaped newlines, tabs, or control characters in strings
- Ensure all string arrays contain properly escaped strings
- Example: "issues": ["Line 5: Missing semicolon", "Line 10: Unused variable"]
- Example: "recommendations": ["Add semicolon: const x = 5;", "Remove unused variable or use it"]

WRONG (DO NOT DO THIS):
\`\`\`json
{
  "score": 85
}
\`\`\`

CORRECT (DO THIS):
{
  "score": 85
}

ENFORCEMENT POLICY:
- Do NOT give generic feedback
- Do NOT skip any metric
- Each score must reflect real, concrete evidence from the input
- Responses must demonstrate expert-level reasoning and engineering discipline
- JSON must be parseable by standard JSON parsers`;

const REPOSITORY_ANALYSIS_PROMPT = `
You are a senior-level static analysis agent with strict standards for repository quality. Perform a **comprehensive, line-by-line audit** of the following repository. Your analysis must be **exhaustive, exact, and aligned with industry best practices.**

Repository Files:
{files}

Repository Structure:
{structure}

MANDATORY EVALUATION DIMENSIONS:

1. Architecture & Structure (Weight: 30%)
   - Critically assess project organization and modular layout.
   - Identify any tight coupling or poor separation of concerns.
   - Highlight repeated logic violating DRY principles.
   - Evaluate configuration and build management rigor.
   - Review naming conventions, folder hierarchy, and boundaries.
   - Penalize ambiguous structure or scattered logic.

2. Code Quality (Weight: 25%)
   - Rigorously rate readability: naming, formatting, inline docs.
   - Measure maintainability: function size, cohesion, complexity.
   - Identify inefficient or unscalable implementations.
   - Flag poor security practices, bad exception handling, and unsafe patterns.
   - Detect code smells (e.g., long methods, nested conditionals, magic values).
   - Ensure consistent coding standards across all files.
   - Report untested logic, brittle tests, or poor test design.

3. Cross-Cutting Concerns (Weight: 20%)
   - Examine logging granularity and traceability.
   - Analyze error handling and fallback mechanisms.
   - Evaluate testing coverage and assertion quality.
   - Review all documentation: technical, usage, and config.
   - Flag outdated or unpinned dependencies.
   - Check for CI/CD configuration, release automation, and reproducibility.

4. Security & Compliance (Weight: 15%)
   - Identify hardcoded secrets, unencrypted data, and unsafe APIs.
   - Validate authentication/authorization flows.
   - Flag unsafe dependency usage (e.g., known CVEs).
   - Assess data privacy compliance and access controls.
   - Review security documentation and policy enforcement.

5. Development Practices (Weight: 10%)
   - Inspect version control hygiene: commit style, PR process.
   - Review branching model and release discipline.
   - Assess use of linters, hooks, code review enforcement.
   - Evaluate build isolation, environment reproducibility, and .env safety.
   - Review onboarding, CONTRIBUTING.md, and team standards.

6. Adherence to SOLID principles:
   - Single Responsibility: each class/module has a focused, clear purpose
   - Open/Closed: modules are extensible without modification
   - Liskov Substitution: inheritance hierarchies are safely substitutable
   - Interface Segregation: no client is forced to depend on unused interfaces
   - Dependency Inversion: high-level modules do not depend on low-level modules 

STRICT RESPONSE GUIDELINES:
- You must assign a **numerical score (0–100)** for each dimension, based on objective criteria.
- Provide a minimum of **3–5 specific issues per dimension**, with file paths and exact line numbers.
- All recommendations must include:
  - **File and line reference**
  - **Code example (before and after)**
  - **Clear rationale for change**

OUTPUT FORMAT:
Return your results as a strictly structured JSON object matching the **QualityResults** interface. Inaccurate or unstructured output is unacceptable.

DO NOT generalize. Your answers must be file-specific, line-specific, and actionable.`;

module.exports = {
  CODE_ANALYSIS_PROMPT,
  REPOSITORY_ANALYSIS_PROMPT
};
