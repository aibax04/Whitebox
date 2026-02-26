const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Sharing = require('../data_models/sharing');
const Roadmap = require('../data_models/roadmap_meta');
const { authMiddleware } = require('./documents');
const prompts = require('../prompts');
require('dotenv').config();

const upload = multer();

// Helper function to extract text from uploaded file buffer
const extractTextFromBuffer = async (buffer, filename) => {
  try {
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'txt' || fileExtension === 'md') {
      return buffer.toString('utf8');
    } else if (fileExtension === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else {
      // Try to parse as text for other file types
      return buffer.toString('utf8');
    }
  } catch (error) {
    console.error('Error extracting text from buffer:', error);
    throw new Error('Failed to extract text from file');
  }
};

// POST /api/strategic-planner/generate-roadmap
// Generate a strategic roadmap from uploaded PRD file
router.post('/generate-roadmap', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { startDate, endDate, saveToDatabase } = req.body;

    // Validate inputs
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Extract text content from uploaded file
    let prdContent;
    try {
      prdContent = await extractTextFromBuffer(file.buffer, file.originalname);
    } catch (error) {
      return res.status(400).json({ error: 'Failed to parse file content', details: error.message });
    }

    if (!prdContent || prdContent.trim().length === 0) {
      return res.status(400).json({ error: 'File content is empty or could not be extracted' });
    }

    // Construct the prompt for roadmap generation using the prompt template
    const prompt = prompts.strategicPlanner.promptTemplates.buildRoadmapGenerationPrompt(
      prdContent,
      startDate,
      endDate
    );

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        context: `Analyzing PRD: ${file.originalname}`
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error('Generate API error:', errorData);
      return res.status(500).json({ error: 'Failed to generate roadmap from AI', details: errorData });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData?.content;

    if (!generatedContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    // Parse the AI response
    let roadmapData;
    try {
      // Clean markdown fences and extract JSON
      let cleanedResponse = generatedContent.replace(/```json|```/g, '').trim();
      
      // Try direct parse first
      try {
        roadmapData = JSON.parse(cleanedResponse);
      } catch {
        // Fallback: extract first JSON object
        const match = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!match) {
          throw new Error('No JSON object found in AI response');
        }
        const jsonString = match[0].replace(/,\s*([}\]])/g, '$1');
        roadmapData = JSON.parse(jsonString);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', generatedContent);
      return res.status(500).json({ 
        error: 'Failed to parse roadmap data from AI response',
        details: parseError.message,
        rawResponse: generatedContent.substring(0, 500) // Send first 500 chars for debugging
      });
    }

    // Optionally save to database
    let savedRoadmap = null;
    if (saveToDatabase === 'true' || saveToDatabase === true) {
      try {
        // Transform the roadmap data to match the MongoDB schema
        const roadmapDoc = new Roadmap({
          userId: req.user._id,
          prdFileName: file.originalname,
          title: roadmapData.title || 'Untitled Roadmap',
          overview: roadmapData.overview || '',
          projectStartDate: startDate,
          projectEndDate: endDate,
          timeframe: roadmapData.timeframe || {
            startYear: new Date(startDate).getFullYear(),
            endYear: new Date(endDate).getFullYear(),
            quarters: ['Q1', 'Q2', 'Q3', 'Q4']
          },
          swimlanes: (roadmapData.swimlanes || []).map(sw => ({
            id: sw.id,
            name: sw.name,
            color: sw.color || '#888888'
          })),
          tasks: (roadmapData.swimlanes || []).flatMap(sw => 
            (sw.tasks || []).map(task => ({
              swimlaneId: sw.id,
              swimlaneName: sw.name,
              id: task.id,
              title: task.title,
              description: task.description || '',
              startDate: task.startDate,
              endDate: task.endDate,
              color: task.color || sw.color || '#888888',
              priority: (task.priority || 'medium').toLowerCase(),
              status: (task.status || 'not-started').toLowerCase(),
              assignee: task.assignee || ''
            }))
          ),
          milestones: (roadmapData.milestones || []).map(m => ({
            id: m.id,
            title: m.title,
            date: m.date,
            description: m.description || ''
          }))
        });

        savedRoadmap = await roadmapDoc.save();
        // console.log('Roadmap saved to database:', savedRoadmap._id);
      } catch (dbError) {
        console.error('Error saving roadmap to database:', dbError);
        // Don't fail the request, just log the error
      }
    }

    // Return the generated roadmap
    res.json({
      success: true,
      message: 'Roadmap generated successfully',
      roadmap: roadmapData,
      savedToDatabase: !!savedRoadmap,
      roadmapId: savedRoadmap?._id,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        startDate,
        endDate,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/strategic-planner/roadmaps
// Get all roadmaps for the authenticated user
router.get('/roadmaps', authMiddleware, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('title overview prdFileName projectStartDate projectEndDate createdAt updatedAt');
    
    res.json({
      success: true,
      count: roadmaps.length,
      roadmaps
    });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: 'Failed to fetch roadmaps', details: error.message });
  }
});

// GET /api/strategic-planner/roadmaps/:id
// Get a specific roadmap by ID
router.get('/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ 
      _id: req.params.id,
      userId: req.user._id 
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    res.json({
      success: true,
      roadmap
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap', details: error.message });
  }
});

// DELETE /api/strategic-planner/roadmaps/:id
// Delete a specific roadmap
router.delete('/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.user._id 
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    res.json({
      success: true,
      message: 'Roadmap deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({ error: 'Failed to delete roadmap', details: error.message });
  }
});

// Get sharing status/history for a file
router.get('/sharing-status/:fileId', authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    // Only show sharing status if user is involved (source or target)
    const sharingRecords = await Sharing.find({ fileId })
      .populate('generatedBy', 'email role')
      .populate('sharedUserId', 'email role')
      .sort({ createdAt: -1 });
    res.json(sharingRecords);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sharing status', error: err.message });
  }
});

module.exports = router;
