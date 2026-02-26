const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');

// Helper function to split code into chunks
function splitCodeIntoChunks(code, chunkSize = 400) {
  const lines = code.split('\n');
  const chunks = [];
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    chunks.push({
      lines: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, lines.length),
      totalLines: lines.length
    });
  }
  
  return chunks;
}

// Helper function to clean AI response (remove markdown code blocks)
function cleanCodeResponse(content, language) {
  let cleaned = content.trim();
  
  // Remove markdown code blocks
  const codeBlockRegex = new RegExp(`\`\`\`${language}[\\s\\S]*?\`\`\``, 'g');
  const genericCodeBlockRegex = /```[\s\S]*?```/g;
  
  // Try language-specific first
  if (codeBlockRegex.test(cleaned)) {
    cleaned = cleaned.replace(new RegExp(`\`\`\`${language}\\s*\\n?`, 'g'), '');
    cleaned = cleaned.replace(/```\s*$/g, '');
  } else if (genericCodeBlockRegex.test(cleaned)) {
    // Try generic code blocks
    cleaned = cleaned.replace(/```[a-zA-Z]*\s*\n?/g, '');
    cleaned = cleaned.replace(/```\s*$/g, '');
  }
  
  return cleaned.trim();
}

// Helper function to refactor a single chunk
async function refactorChunk(chunk, language, baseUrl, isLargeFile = false) {
  const contextInfo = isLargeFile 
    ? `\n\nCONTEXT: This is part of a larger file (lines ${chunk.startLine}-${chunk.endLine} of ${chunk.totalLines} total lines). Refactor this section while maintaining compatibility with the rest of the file. Preserve all imports, function signatures, and class definitions exactly.`
    : '';
  
  const prompt = `Refactor the following ${language} code to improve structure, maintainability, and clarity while preserving all existing functionality. Return only the refactored code without any explanations, comments, or markdown formatting.${contextInfo}

CODE TO REFACTOR:
${chunk.lines.join('\n')}`;

  const aiResponse = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      requestType: 'refactoring',
      language
    })
  });

  if (!aiResponse.ok) {
    const errorData = await aiResponse.json().catch(() => ({}));
    throw new Error(`Failed to refactor chunk: ${JSON.stringify(errorData)}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData?.content;

  if (!content) {
    throw new Error('No content generated from AI for chunk');
  }

  return cleanCodeResponse(content, language);
}

// Refactor code with AI
router.post('/refactor', authMiddleware, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'code and language are required' });
    }

    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    // Count lines in the code
    const lines = code.split('\n');
    const lineCount = lines.length;
    
    console.log(`🔧 Refactoring ${language} code with ${lineCount} lines...`);

    // If code is less than 500 lines, process it as a single chunk
    if (lineCount < 500) {
      const prompt = `Refactor the following ${language} code to improve structure, maintainability, and clarity while preserving all existing functionality. Return only the refactored code without any explanations, comments, or markdown formatting.

CODE TO REFACTOR:
${code}`;

      const aiResponse = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          requestType: 'refactoring',
          language
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        return res.status(500).json({ error: 'Failed to refactor code', details: errorData });
      }

      const aiData = await aiResponse.json();
      const content = aiData?.content;

      if (!content) {
        return res.status(500).json({ error: 'No content generated from AI' });
      }

      const cleanedContent = cleanCodeResponse(content, language);
      return res.json({ content: cleanedContent });
    }

    // For large files (500+ lines), split into chunks
    console.log(`Large file detected (${lineCount} lines). Processing in chunks...`);
    
    const chunks = splitCodeIntoChunks(code, 400);
    console.log(`Split into ${chunks.length} chunks`);
    
    // Process all chunks in parallel for speed
    const startTime = Date.now();
    console.log(`⚡ Processing all ${chunks.length} chunks in parallel...`);
    
    const refactorPromises = chunks.map(async (chunk, i) => {
      try {
        const refactoredChunk = await refactorChunk(chunk, language, baseUrl, true);
        console.log(`✓ Chunk ${i + 1} refactored`);
        return refactoredChunk;
      } catch (chunkError) {
        console.error(`Error refactoring chunk ${i + 1}:`, chunkError.message);
        // If a chunk fails, use the original code for that chunk
        return chunk.lines.join('\n');
      }
    });
    
    const refactoredChunks = await Promise.all(refactorPromises);
    
    // Combine all refactored chunks
    const combinedRefactoredCode = refactoredChunks.join('\n');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Successfully refactored ${lineCount} lines into ${combinedRefactoredCode.split('\n').length} lines in ${duration}s`);
    
    res.json({ content: combinedRefactoredCode });
  } catch (error) {
    console.error('Refactoring error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

