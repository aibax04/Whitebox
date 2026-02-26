
/**
 * Re-export all refactoring functions and utilities from the refactors folder
 */
export {
  refactorCode,
  refactorJavaScript,
  refactorPython,
  refactorCPP,
  refactorJava,
  refactorGeneric,
  calculateCodeQualityMetrics,
  calculateReadabilityScore,
  calculateMaintainabilityScore,
  calculatePerformanceScore,
  calculateSecurityScore,
  calculateCodeSmellScore
} from './refactors';

// Use 'export type' when re-exporting types with isolatedModules
export type { RefactoringOptions } from './refactors';

// Export the Python-specific utilities
export { refactorPython as refactorPythonCode } from './refactors/pythonRefactor';
