
export interface TestCaseProps {
  fileContent: string | null;
  fileName: string | null;
  onClearFile?: () => void;
}

export interface TestCase {
  id: number;
  name: string;
  type: string;
  code: string;
  description: string;
}

export interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  message: string;
}

export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  coverage: number;
  details: TestResult[];
}
