/**
 * Refactoring Prompt Templates
 * Contains prompt templates for code refactoring operations
 */

const buildRefactoringPrompt = (code, language) => {
  return `
REFACTORING TASK:
Refactor the following ${language} code to improve structure, maintainability, and clarity while preserving all existing functionality.

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

REFACTORING REQUIREMENTS:
1. Apply SOLID principles and modular design
2. Remove redundant or duplicated logic via helper abstractions
3. Improve readability through meaningful naming conventions
4. Isolate complex logic into manageable, testable units
5. Add accurate, complete JSDoc/docstrings to all non-trivial/public methods
6. Improve performance and efficiency where possible (no behavioral changes)
7. Harden error handling via structured try/catch and specific failure modes
8. Resolve latent issues (bugs, race conditions, edge cases) if outcome remains identical
9. Integrate lightweight, well-known design patterns only if they simplify complexity without adding behavior
10. Patch minor security vulnerabilities (e.g., injection/XSS) using minimal, precise fixes

CRITICAL CONSTRAINTS:
- Do NOT modify logic, conditionals, data flows, or side effects
- Do NOT change function names, parameter lists, return values, or types
- Do NOT add, remove, or modify any imports, dependencies, or packages
- Do NOT introduce new capabilities, nor remove any current functionality
- Do NOT add commentary, explanations, markdown, or annotations of any kind

Return ONLY the fully refactored code, ready for execution, maintaining original file structure, indentation, and formatting style.
`;
};

module.exports = {
  buildRefactoringPrompt
};
