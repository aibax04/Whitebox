
import { getLanguageTestTemplates } from "./testTemplates/languageTestTemplates";
import { applyRustConcurrencySpecialCase } from "./testTemplates/rustSpecialCases";
import { generateGenericTestCases } from "./testTemplates/genericTestTemplates";

// Main exported function
export const getTestTemplates = (language: string, functionName: string) => {
  const templates = getLanguageTestTemplates(language, functionName);
  applyRustConcurrencySpecialCase(language, functionName, templates);
  return templates;
};

export { generateGenericTestCases };
