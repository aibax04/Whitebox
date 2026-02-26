
/**
 * Handles Rust-specific test template edge cases (used by getTestTemplates)
 */
export function applyRustConcurrencySpecialCase(language: string, functionName: string, templates: Record<string, any>) {
  if (language === 'rust') {
    templates['rust'].concurrency = {
      code: `#[test]\nfn test_${functionName}_concurrency() {\n    // Arrange\n    use std::sync::{Arc, Mutex};\n    use std::thread;\n    \n    let results = Arc::new(Mutex::new(Vec::new()));\n    let mut handles = vec![];\n    \n    // Act\n    for _ in 0..5 {\n        let results_clone = Arc::clone(&results);\n        let handle = thread::spawn(move || {\n            let result = ${functionName}("input");\n            let mut results = results_clone.lock().unwrap();\n            results.push(result);\n        });\n        handles.push(handle);\n    }\n    \n    for handle in handles {\n        handle.join().unwrap();\n    }\n    \n    // Assert\n    let final_results = results.lock().unwrap();\n    assert_eq!(5, final_results.len());\n}`,
      description: "Validates that the function works correctly under concurrent access."
    };
  }
}
