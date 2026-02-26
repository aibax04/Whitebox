const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');

// Helper function to process and clean analysis content
function processAnalysisContent(content) {
  // Safety check: if content is excessively long, truncate it
  if (content.length > 100000) {
    console.warn(`AI response is extremely long (${content.length} chars), truncating...`);
    content = content.substring(0, 100000);
  }

  try {
    let cleanedContent = content;
    
    // Remove markdown code blocks if present
    if (cleanedContent.includes('```json')) {
      cleanedContent = cleanedContent.replace(/```json[\r\n]*|```[\r\n]*/g, '').trim();
    }
    
    // If JSON is truncated, try to fix it
    if (!cleanedContent.endsWith('}')) {
      console.warn('JSON appears truncated, attempting to fix...');
      // Find the last complete array or object
      const lastValidBrace = cleanedContent.lastIndexOf(']');
      if (lastValidBrace > 0) {
        cleanedContent = cleanedContent.substring(0, lastValidBrace + 1);
        // Add closing braces
        cleanedContent += '\n}';
      }
    }
    
    // Try to parse the cleaned content to ensure it's valid JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanedContent);
    } catch (initialParseError) {
      console.warn('Initial parse failed, attempting aggressive cleanup...');
      
      // Try to extract just the JSON object
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Attempt to fix unterminated strings by truncating at the last complete entry
        let jsonStr = jsonMatch[0];
        const lastCompleteComma = jsonStr.lastIndexOf('",');
        if (lastCompleteComma > 0) {
          // Truncate to last complete entry
          jsonStr = jsonStr.substring(0, lastCompleteComma + 1);
          // Close arrays and object
          jsonStr += '\n  ]\n}';
          parsedContent = JSON.parse(jsonStr);
        } else {
          throw initialParseError;
        }
      } else {
        throw initialParseError;
      }
    }
    
    // Validate required fields
    const requiredFields = ['score', 'readabilityScore', 'maintainabilityScore', 'performanceScore', 'securityScore', 'codeSmellScore', 'issues', 'recommendations'];
    const missingFields = requiredFields.filter(field => !(field in parsedContent));
    
    if (missingFields.length > 0) {
      console.warn('AI response missing required fields:', missingFields);
      // Provide defaults for missing fields
      if (!parsedContent.issues) parsedContent.issues = [];
      if (!parsedContent.recommendations) parsedContent.recommendations = [];
    }
    
    // CRITICAL: Deduplicate issues and recommendations
    const deduplicateArray = (arr) => {
      const seen = new Set();
      const unique = [];
      for (const item of arr) {
        // Normalize the string for comparison (trim, lowercase)
        const normalized = item.trim().toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          unique.push(item);
        }
      }
      return unique;
    };
    
    // Deduplicate and limit to reasonable numbers
    parsedContent.issues = deduplicateArray(parsedContent.issues || []).slice(0, 50);
    parsedContent.recommendations = deduplicateArray(parsedContent.recommendations || []).slice(0, 50);
    
    return parsedContent;
  } catch (parseError) {
    console.error('AI response is not valid JSON after cleaning:', parseError.message);
    console.error('Raw content preview:', content?.substring(0, 500) + '...');
    
    // Return a fallback response
    return {
      score: 0,
      readabilityScore: 0,
      maintainabilityScore: 0,
      performanceScore: 0,
      securityScore: 0,
      codeSmellScore: 0,
      issues: ['AI response was not in valid JSON format. The AI may have generated too many issues. Please try again.'],
      recommendations: ['The AI analysis failed due to formatting issues. Please retry the analysis.'],
      structuredIssues: [],
      structuredRecommendations: []
    };
  }
}

// Helper function to split code into chunks for analysis
function splitCodeIntoChunks(code, chunkSize = 400) {
  const lines = code.split('\n');
  const chunks = [];
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    chunks.push({
      lines: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, lines.length),
      totalLines: lines.length,
      code: chunk.join('\n')
    });
  }
  
  return chunks;
}

// Helper function to analyze a single chunk (simplified for large files)
async function analyzeChunk(chunk, language, baseUrl, isLargeFile = false, isRefactored = false) {
  const codeType = isRefactored ? 'refactored' : '';
  const userPrompt = `Analyze the following ${codeType} ${language} code and return only an overall quality score.\n\n${chunk.code}`;

  const requestType = isRefactored ? 'code-analysis-refactored' : 'code-analysis-chunk';

  const aiResponse = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: userPrompt,
      requestType: requestType,
      language
    })
  });

  if (!aiResponse.ok) {
    const errorData = await aiResponse.json().catch(() => ({}));
    throw new Error(`Failed to analyze chunk: ${JSON.stringify(errorData)}`);
  }

  const aiData = await aiResponse.json();
  return aiData?.content;
}


// Helper function to aggregate analysis results from multiple chunks (simplified)
function aggregateAnalysisResults(chunkResults, chunks) {
  const aggregated = {
    score: 0,
    readabilityScore: 0,
    maintainabilityScore: 0,
    performanceScore: 0,
    securityScore: 0,
    codeSmellScore: 0,
    issues: [],
    recommendations: [],
    structuredIssues: [],
    structuredRecommendations: []
  };

  let totalScore = 0;
  let validChunks = 0;

  chunkResults.forEach((result, index) => {
    if (result && typeof result === 'object' && result.score !== undefined) {
      totalScore += result.score;
      validChunks++;
    }
  });

  // Calculate average score
  if (validChunks > 0) {
    aggregated.score = Math.round(totalScore / validChunks);
    // For large files, set all sub-scores to match the overall score
    aggregated.readabilityScore = aggregated.score;
    aggregated.maintainabilityScore = aggregated.score;
    aggregated.performanceScore = aggregated.score;
    aggregated.securityScore = aggregated.score;
    aggregated.codeSmellScore = aggregated.score;
  }

  return aggregated;
}

// Analyze code with AI
router.post('/analyze-code', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Analysis endpoint called');
    const { code, language, isRefactored } = req.body;

    if (!code || !language) {
      console.log('❌ Missing code or language');
      return res.status(400).json({ error: 'code and language are required' });
    }

    // Check code length
    const lineCount = code.split('\n').length;
    const codeType = isRefactored ? 'refactored' : 'original';
    console.log(`📊 Analyzing ${codeType} ${language} code with ${lineCount} lines...`);
    
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

    // If code is less than 500 lines, process it normally
    if (lineCount < 500) {

      // Build user prompt
      const userPrompt = `Analyze the following ${language} code and return strict JSON metrics as per system instructions.\n\n${code}`;

      const aiResponse = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: userPrompt,
          requestType: 'code-analysis',
          language
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        return res.status(500).json({ error: 'Failed to analyze code', details: errorData });
      }

      const aiData = await aiResponse.json();
      let content = aiData?.content;

      if (!content) {
        return res.status(500).json({ error: 'No content generated from AI' });
      }

      // Process the content using the shared processing function
      const processedContent = processAnalysisContent(content);
      return res.json({ content: JSON.stringify(processedContent) });
    }

    // For large files (500+ lines), split into chunks
    console.log(`Large file detected (${lineCount} lines). Processing in chunks...`);
    
    const chunks = splitCodeIntoChunks(code, 400);
    console.log(`Split into ${chunks.length} chunks for analysis`);
    
    // Process all chunks in parallel for speed
    const startTime = Date.now();
    console.log(`⚡ Processing all ${chunks.length} chunks in parallel...`);
    
    const chunkPromises = chunks.map(async (chunk, i) => {
      try {
        const content = await analyzeChunk(chunk, language, baseUrl, true, isRefactored);
        
        if (!content) {
          console.warn(`No content generated for chunk ${i + 1}`);
          return null;
        }

        // Parse the simplified response (just a score)
        try {
          let cleaned = content.trim();
          // Remove markdown code blocks if present
          cleaned = cleaned.replace(/```json[\r\n]*|```[\r\n]*/g, '').trim();
          
          const parsed = JSON.parse(cleaned);
          console.log(`✓ Chunk ${i + 1} score: ${parsed.score}`);
          return parsed;
        } catch (parseError) {
          console.error(`Failed to parse chunk ${i + 1} response:`, parseError.message);
          return null;
        }
      } catch (chunkError) {
        console.error(`Error analyzing chunk ${i + 1}:`, chunkError.message);
        return null;
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    
    // Aggregate results from all chunks
    const aggregatedResult = aggregateAnalysisResults(chunkResults, chunks);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Successfully analyzed ${lineCount} lines in ${duration}s. Average score: ${aggregatedResult.score}`);
    
    res.json({ content: JSON.stringify(aggregatedResult) });
  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

