
import { LucideIcon } from "lucide-react";

export interface CodeIssue {
  line?: number;
  lineRange?: { start: number; end: number };
  message: string;
  severity?: 'error' | 'warning' | 'info';
  category?: string;
}

export interface QualityResults {
  score: number;
  readabilityScore: number;
  maintainabilityScore: number;
  performanceScore: number;
  securityScore: number;
  codeSmellScore: number;
  issues: string[];
  recommendations: string[];
  structuredIssues?: CodeIssue[];
  structuredRecommendations?: CodeIssue[];
  summary?: string;
  categories?: CategoryScore[];
  snippets?: CodeSnippet[];
  refactoredCode?: string;
}

export interface CategoryScore {
  name: string;
  score: number;
  icon?: LucideIcon;
}

export interface CodeSnippet {
  title: string;
  code: string;
  suggestion: string;
}
