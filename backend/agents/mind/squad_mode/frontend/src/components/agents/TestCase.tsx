
import TestCaseGenerator from './test-case/TestCaseGenerator';
import { TestCaseProps } from './test-case/types';

export default function TestCase(props: TestCaseProps) {
  return <TestCaseGenerator {...props} />;
}
