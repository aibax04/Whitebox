/**
 * Provides test templates for different languages, by function name
 */
export const getLanguageTestTemplates = (language: string, functionName: string) => {
  const testTemplates: Record<string, Record<string, { code: string; description: string }>> = {
    'python': {
      positive: {
        code: `def test_${functionName}_valid_input():\n    # Arrange\n    input_value = "example_input"\n    expected = "expected_output"\n    \n    # Act\n    result = ${functionName}(input_value)\n    \n    # Assert\n    assert result == expected\n    assert result is not None`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `def test_${functionName}_invalid_input():\n    # Arrange\n    with pytest.raises(ValueError):\n        # Act & Assert\n        ${functionName}(None)`,
        description: "Checks that the function properly handles invalid input by raising an appropriate exception."
      },
      edge: {
        code: `def test_${functionName}_edge_case():\n    # Arrange\n    input_value = ""\n    \n    # Act\n    result = ${functionName}(input_value)\n    \n    # Assert\n    assert result == ""`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `def test_${functionName}_performance():\n    # Arrange\n    large_input = "x" * 1000\n    \n    # Act\n    start_time = time.time()\n    result = ${functionName}(large_input)\n    end_time = time.time()\n    \n    # Assert\n    assert end_time - start_time < 1.0  # Should complete in under 1 second`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `def test_${functionName}_concurrent_access():\n    # Arrange\n    results = []\n    \n    def worker():\n        results.append(${functionName}("worker_input"))\n    \n    # Act\n    threads = [threading.Thread(target=worker) for _ in range(5)]\n    for t in threads:\n        t.start()\n    for t in threads:\n        t.join()\n    \n    # Assert\n    assert len(results) == 5`,
        description: "Validates that the function works correctly under concurrent access."
      }
    },
    'javascript': {
      positive: {
        code: `test('${functionName} handles valid input correctly', () => {\n  // Arrange\n  const input = 'example_input';\n  const expected = 'expected_output';\n  \n  // Act\n  const result = ${functionName}(input);\n  \n  // Assert\n  expect(result).toBe(expected);\n  expect(result).not.toBeNull();\n});`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `test('${functionName} throws error for invalid input', () => {\n  // Arrange & Act & Assert\n  expect(() => {\n    ${functionName}(null);\n  }).toThrow();\n});`,
        description: "Checks that the function properly handles invalid input by throwing an error."
      },
      edge: {
        code: `test('${functionName} handles edge cases', () => {\n  // Arrange\n  const input = '';\n  \n  // Act\n  const result = ${functionName}(input);\n  \n  // Assert\n  expect(result).toBe('');\n});`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `test('${functionName} performs efficiently with large input', () => {\n  // Arrange\n  const largeInput = 'x'.repeat(1000);\n  \n  // Act\n  const startTime = Date.now();\n  const result = ${functionName}(largeInput);\n  const endTime = Date.now();\n  \n  // Assert\n  expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second\n});`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `test('${functionName} handles concurrent calls', async () => {\n  // Arrange\n  const promises = [];\n  \n  // Act\n  for (let i = 0; i < 5; i++) {\n    promises.push(Promise.resolve(${functionName}('input')));\n  }\n  const results = await Promise.all(promises);\n  \n  // Assert\n  expect(results.length).toBe(5);\n});`,
        description: "Validates that the function works correctly with concurrent calls."
      }
    },
    'typescript': {
      positive: {
        code: `test('${functionName} handles valid input correctly', () => {\n  // Arrange\n  const input = 'example_input';\n  const expected = 'expected_output';\n  \n  // Act\n  const result = ${functionName}(input);\n  \n  // Assert\n  expect(result).toBe(expected);\n  expect(result).not.toBeNull();\n});`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `test('${functionName} throws error for invalid input', () => {\n  // Arrange & Act & Assert\n  expect(() => {\n    ${functionName}(null as any);\n  }).toThrow();\n});`,
        description: "Checks that the function properly handles invalid input by throwing an appropriate exception."
      },
      edge: {
        code: `test('${functionName} handles edge cases', () => {\n  // Arrange\n  const input = '';\n  \n  // Act\n  const result = ${functionName}(input);\n  \n  // Assert\n  expect(result).toBe('');\n});`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `test('${functionName} performs efficiently with large input', () => {\n  // Arrange\n  const largeInput = 'x'.repeat(1000);\n  \n  // Act\n  const startTime = Date.now();\n  const result = ${functionName}(largeInput);\n  const endTime = Date.now();\n  \n  // Assert\n  expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second\n});`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `test('${functionName} handles concurrent calls', async () => {\n  // Arrange\n  const promises: Promise<any>[] = [];\n  \n  // Act\n  for (let i = 0; i < 5; i++) {\n    promises.push(Promise.resolve(${functionName}('input')));\n  }\n  const results = await Promise.all(promises);\n  \n  // Assert\n  expect(results.length).toBe(5);\n});`,
        description: "Validates that the function works correctly with concurrent calls."
      }
    },
    'java': {
      positive: {
        code: `@Test\npublic void test${functionName}ValidInput() {\n    // Arrange\n    String input = "example_input";\n    String expected = "expected_output";\n    \n    // Act\n    String result = ${functionName}(input);\n    \n    // Assert\n    assertEquals(expected, result);\n    assertNotNull(result);\n}`,
        description: "Verifies that the method returns expected output when given valid input."
      },
      negative: {
        code: `@Test(expected = IllegalArgumentException.class)\npublic void test${functionName}InvalidInput() {\n    // Arrange & Act & Assert\n    ${functionName}(null);\n}`,
        description: "Checks that the method properly handles invalid input by throwing an appropriate exception."
      },
      edge: {
        code: `@Test\npublic void test${functionName}EdgeCase() {\n    // Arrange\n    String input = "";\n    \n    // Act\n    String result = ${functionName}(input);\n    \n    // Assert\n    assertEquals("", result);\n}`,
        description: "Tests the method's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `@Test\npublic void test${functionName}Performance() {\n    // Arrange\n    StringBuilder sb = new StringBuilder();\n    for (int i = 0; i < 1000; i++) {\n        sb.append("x");\n    }\n    String largeInput = sb.toString();\n    \n    // Act\n    long startTime = System.currentTimeMillis();\n    String result = ${functionName}(largeInput);\n    long endTime = System.currentTimeMillis();\n    \n    // Assert\n    assertTrue(endTime - startTime < 1000); // Should complete in under 1 second\n}`,
        description: "Ensures the method performs efficiently with large inputs."
      },
      concurrency: {
        code: `@Test\npublic void test${functionName}Concurrency() throws InterruptedException {\n    // Arrange\n    final List<String> results = new CopyOnWriteArrayList<>();\n    int threadCount = 5;\n    CountDownLatch latch = new CountDownLatch(threadCount);\n    \n    // Act\n    for (int i = 0; i < threadCount; i++) {\n        new Thread(() -> {\n            results.add(${functionName}("input"));\n            latch.countDown();\n        }).start();\n    }\n    latch.await(5, TimeUnit.SECONDS);\n    \n    // Assert\n    assertEquals(threadCount, results.size());\n}`,
        description: "Validates that the method works correctly under concurrent access."
      }
    },
    'cpp': {
      positive: {
        code: `TEST(${functionName}Test, ValidInput) {\n    // Arrange\n    std::string input = "example_input";\n    std::string expected = "expected_output";\n    \n    // Act\n    std::string result = ${functionName}(input);\n    \n    // Assert\n    EXPECT_EQ(expected, result);\n    EXPECT_FALSE(result.empty());\n}`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `TEST(${functionName}Test, InvalidInput) {\n    // Arrange & Act & Assert\n    EXPECT_THROW(${functionName}(nullptr), std::invalid_argument);\n}`,
        description: "Checks that the function properly handles invalid input by throwing an appropriate exception."
      },
      edge: {
        code: `TEST(${functionName}Test, EdgeCase) {\n    // Arrange\n    std::string input = "";\n    \n    // Act\n    std::string result = ${functionName}(input);\n    \n    // Assert\n    EXPECT_EQ("", result);\n}`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `TEST(${functionName}Test, Performance) {\n    // Arrange\n    std::string largeInput(1000, 'x');\n    \n    // Act\n    auto startTime = std::chrono::high_resolution_clock::now();\n    std::string result = ${functionName}(largeInput);\n    auto endTime = std::chrono::high_resolution_clock::now();\n    \n    // Assert\n    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();\n    EXPECT_LT(duration, 1000); // Should complete in under 1 second\n}`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `TEST(${functionName}Test, Concurrency) {\n    // Arrange\n    std::vector<std::string> results;\n    std::mutex mutex;\n    std::vector<std::thread> threads;\n    \n    // Act\n    for (int i = 0; i < 5; i++) {\n        threads.push_back(std::thread([&mutex, &results](){\n            std::string result = ${functionName}("input");\n            std::lock_guard<std::mutex> lock(mutex);\n            results.push_back(result);\n        }));\n    }\n    \n    for (auto& thread : threads) {\n        thread.join();\n    }\n    \n    // Assert\n    EXPECT_EQ(5, results.size());\n}`,
        description: "Validates that the function works correctly under concurrent access."
      }
    },
    'ruby': {
      positive: {
        code: `test "${functionName} with valid input" do\n    # Arrange\n    input = "example_input"\n    expected = "expected_output"\n    \n    # Act\n    result = ${functionName}(input)\n    \n    # Assert\n    assert_equal expected, result\n    assert_not_nil result\nend`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `test "${functionName} with invalid input" do\n    # Arrange & Act & Assert\n    assert_raises(ArgumentError) do\n        ${functionName}(nil)\n    end\nend`,
        description: "Checks that the function properly handles invalid input by raising an appropriate exception."
      },
      edge: {
        code: `test "${functionName} with edge case" do\n    # Arrange\n    input = ""\n    \n    // Act\n    result = ${functionName}(input)\n    \n    // Assert\n    assert_equal "", result\nend`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `test "${functionName} performance" do\n    # Arrange\n    large_input = "x" * 1000\n    \n    // Act\n    start_time = Time.now\n    result = ${functionName}(large_input)\n    end_time = Time.now\n    \n    // Assert\n    assert (end_time - start_time) < 1.0  # Should complete in under 1 second\nend`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `test "${functionName} concurrency" do\n    # Arrange\n    results = []\n    threads = []\n    mutex = Mutex.new\n    \n    // Act\n    5.times do\n        threads << Thread.new do\n            result = ${functionName}("input")\n            mutex.synchronize { results << result }\n        end\n    end\n    threads.each(&:join)\n    \n    // Assert\n    assert_equal 5, results.size\nend`,
        description: "Validates that the function works correctly under concurrent access."
      }
    },
    'go': {
      positive: {
        code: `func Test${functionName}ValidInput(t *testing.T) {\n    // Arrange\n    input := "example_input"\n    expected := "expected_output"\n    \n    // Act\n    result := ${functionName}(input)\n    \n    // Assert\n    if result != expected {\n        t.Errorf("Expected %s, got %s", expected, result)\n    }\n    if result == "" {\n        t.Error("Result should not be empty")\n    }\n}`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `func Test${functionName}InvalidInput(t *testing.T) {\n    // Arrange & Act & Assert\n    defer func() {\n        if r := recover(); r == nil {\n            t.Error("Expected function to panic with nil input, but it didn't")\n        }\n    }()\n    ${functionName}(nil)\n}`,
        description: "Checks that the function properly handles invalid input by panicking."
      },
      edge: {
        code: `func Test${functionName}EdgeCase(t *testing.T) {\n    // Arrange\n    input := ""\n    \n    // Act\n    result := ${functionName}(input)\n    \n    // Assert\n    if result != "" {\n        t.Errorf("Expected empty string, got %s", result)\n    }\n}`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `func Test${functionName}Performance(t *testing.T) {\n    // Arrange\n    largeInput := strings.Repeat("x", 1000)\n    \n    // Act\n    startTime := time.Now()\n    result := ${functionName}(largeInput)\n    endTime := time.Now()\n    \n    // Assert\n    duration := endTime.Sub(startTime)\n    if duration.Milliseconds() > 1000 {\n        t.Errorf("Function took too long: %v", duration)\n    }\n    if result == "" {\n        t.Error("Result should not be empty")\n    }\n}`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `func Test${functionName}Concurrency(t *testing.T) {\n    // Arrange\n    var wg sync.WaitGroup\n    var mu sync.Mutex\n    results := make([]string, 0, 5)\n    \n    // Act\n    for i := 0; i < 5; i++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            result := ${functionName}("input")\n            mu.Lock()\n            results = append(results, result)\n            mu.Unlock()\n        }()\n    }\n    wg.Wait()\n    \n    // Assert\n    if len(results) != 5 {\n        t.Errorf("Expected 5 results, got %d", len(results))\n    }\n}`,
        description: "Validates that the function works correctly under concurrent access."
      }
    },
    'rust': {
      positive: {
        code: `#[test]\nfn test_${functionName}_valid_input() {\n    // Arrange\n    let input = "example_input";\n    let expected = "expected_output";\n    \n    // Act\n    let result = ${functionName}(input);\n    \n    // Assert\n    assert_eq!(expected, result);\n    assert!(!result.is_empty());\n}`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `#[test]\n#[should_panic]\nfn test_${functionName}_invalid_input() {\n    // Arrange & Act & Assert\n    ${functionName}(None);\n}`,
        description: "Checks that the function properly handles invalid input by panicking."
      },
      edge: {
        code: `#[test]\nfn test_${functionName}_edge_case() {\n    // Arrange\n    let input = "";\n    \n    // Act\n    let result = ${functionName}(input);\n    \n    // Assert\n    assert_eq!("", result);\n}`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `#[test]\nfn test_${functionName}_performance() {\n    // Arrange\n    let large_input = "x".repeat(1000);\n    \n    // Act\n    let start_time = std::time::Instant::now();\n    let result = ${functionName}(&large_input);\n    let duration = start_time.elapsed();\n    \n    // Assert\n    assert!(duration < std::time::Duration::from_secs(1)); // Should complete in under 1 second\n    assert!(!result.is_empty());\n}`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `#[test]\nfn test_${functionName}_concurrency() {\n    // Arrange\n    use std::sync::{Arc, Mutex};\n    use std::thread;\n    \n    let results = Arc::new(Mutex::new(Vec::new()));\n    let mut handles = vec![];\n    \n    // Act\n    for _ in 0..5 {\n        let results_clone = Arc::clone(&results);\n        let handle = thread::spawn(move || {\n            let result = ${functionName}("input");\n            let mut results = results_clone.lock().unwrap();\n            results.push(result);\n        }());\n        handles.push(handle);\n    }\n    \n    for handle in handles {\n        handle.join().unwrap();\n    }\n    \n    // Assert\n    let final_results = results.lock().unwrap();\n    assert_eq!(5, final_results.len());\n}`,
        description: "Validates that the function works correctly under concurrent access."
      }
    },
    'c': {
      positive: {
        code: `void test_${functionName}_valid_input(void) {\n    // Arrange\n    char input[] = "example_input";\n    char expected[] = "expected_output";\n    \n    // Act\n    char* result = ${functionName}(input);\n    \n    // Assert\n    TEST_ASSERT_EQUAL_STRING(expected, result);\n    TEST_ASSERT_NOT_NULL(result);\n    free(result);\n}`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `void test_${functionName}_invalid_input(void) {\n    // Arrange & Act & Assert\n    TEST_ASSERT_NULL(${functionName}(NULL));\n}`,
        description: "Checks that the function properly handles NULL input by returning NULL."
      },
      edge: {
        code: `void test_${functionName}_edge_case(void) {\n    // Arrange\n    char input[] = "";\n    \n    // Act\n    char* result = ${functionName}(input);\n    \n    // Assert\n    TEST_ASSERT_EQUAL_STRING("", result);\n    free(result);\n}`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `void test_${functionName}_performance(void) {\n    // Arrange\n    char* large_input = malloc(1001);\n    memset(large_input, 'x', 1000);\n    large_input[1000] = '\\0';\n    \n    // Act\n    clock_t start_time = clock();\n    char* result = ${functionName}(large_input);\n    clock_t end_time = clock();\n    \n    // Assert\n    double time_spent = (double)(end_time - start_time) / CLOCKS_PER_SEC;\n    TEST_ASSERT_TRUE(time_spent < 1.0); // Should complete in under 1 second\n    TEST_ASSERT_NOT_NULL(result);\n    \n    free(large_input);\n    free(result);\n}`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `void test_${functionName}_basic_functionality(void) {\n    // Arrange\n    char input[] = "example_input";\n    \n    // Act\n    char* result = ${functionName}(input);\n    \n    // Assert\n    TEST_ASSERT_NOT_NULL(result);\n    free(result);\n}`,
        description: "Basic test for function functionality (C lacks standard threading support)."
      }
    },
    'csharp': {
      positive: {
        code: `[Test]\npublic void Test${functionName}ValidInput()\n{\n    // Arrange\n    string input = "example_input";\n    string expected = "expected_output";\n    \n    // Act\n    string result = ${functionName}(input);\n    \n    // Assert\n    Assert.AreEqual(expected, result);\n    Assert.IsNotNull(result);\n}`,
        description: "Verifies that the method returns expected output when given valid input."
      },
      negative: {
        code: `[Test]\npublic void Test${functionName}InvalidInput()\n{\n    // Arrange & Act & Assert\n    Assert.Throws<ArgumentException>(() => ${functionName}(null));\n}`,
        description: "Checks that the method properly handles invalid input by throwing an appropriate exception."
      },
      edge: {
        code: `[Test]\npublic void Test${functionName}EdgeCase()\n{\n    // Arrange\n    string input = "";\n    \n    // Act\n    string result = ${functionName}(input);\n    \n    // Assert\n    Assert.AreEqual("", result);\n}`,
        description: "Tests the method's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `[Test]\npublic void Test${functionName}Performance()\n{\n    // Arrange\n    string largeInput = new string('x', 1000);\n    \n    // Act\n    var stopwatch = Stopwatch.StartNew();\n    string result = ${functionName}(largeInput);\n    stopwatch.Stop();\n    \n    // Assert\n    Assert.Less(stopwatch.ElapsedMilliseconds, 1000); // Should complete in under 1 second\n    Assert.IsNotNull(result);\n}`,
        description: "Ensures the method performs efficiently with large inputs."
      },
      concurrency: {
        code: `[Test]\npublic void Test${functionName}Concurrency()\n{\n    // Arrange\n    var results = new ConcurrentBag<string>();\n    \n    // Act\n    Parallel.For(0, 5, _ =>\n    {\n        results.Add(${functionName}("input"));\n    });\n    \n    // Assert\n    Assert.AreEqual(5, results.Count);\n}`,
        description: "Validates that the method works correctly under concurrent access."
      }
    },
    'php': {
      positive: {
        code: `public function test${functionName}ValidInput(): void\n{\n    // Arrange\n    $input = "example_input";\n    $expected = "expected_output";\n    \n    // Act\n    $result = ${functionName}($input);\n    \n    // Assert\n    $this->assertEquals($expected, $result);\n    $this->assertNotEmpty($result);\n}`,
        description: "Verifies that the function returns expected output when given valid input."
      },
      negative: {
        code: `public function test${functionName}InvalidInput(): void\n{\n    // Arrange & Act & Assert\n    $this->expectException(\\InvalidArgumentException::class);\n    ${functionName}(null);\n}`,
        description: "Checks that the function properly handles invalid input by throwing an appropriate exception."
      },
      edge: {
        code: `public function test${functionName}EdgeCase(): void\n{\n    // Arrange\n    $input = "";\n    \n    // Act\n    $result = ${functionName}($input);\n    \n    // Assert\n    $this->assertEquals("", $result);\n}`,
        description: "Tests the function's behavior with edge case inputs (empty string)."
      },
      performance: {
        code: `public function test${functionName}Performance(): void\n{\n    // Arrange\n    $largeInput = str_repeat("x", 1000);\n    \n    // Act\n    $startTime = microtime(true);\n    $result = ${functionName}($largeInput);\n    $endTime = microtime(true);\n    \n    // Assert\n    $this->assertLessThan(1.0, $endTime - $startTime); // Should complete in under 1 second\n    $this->assertNotEmpty($result);\n}`,
        description: "Ensures the function performs efficiently with large inputs."
      },
      concurrency: {
        code: `public function test${functionName}BasicFunctionality(): void\n{\n    // PHP doesn't have native threading in its test framework, so we'll test basic functionality\n    // Arrange\n    $input = "example_input";\n    \n    // Act\n    $result = ${functionName}($input);\n    \n    // Assert\n    $this->assertNotEmpty($result);\n}`,
        description: "Basic test for function functionality (PHP lacks built-in threading support in tests)."
      }
    },
    'default': {
      positive: {
        code: `// Generic test placeholder\nBOOLEAN_ASSERT(true);`,
        description: "A generic test case when no specific language template is available."
      }
    }
  };
  return testTemplates[language] || testTemplates['default'];
};
