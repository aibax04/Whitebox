const express = require('express');
const router = express.Router();
const ChatSession = require('../data_models/prd_chat');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');
const prdChatbotPrompts = require('../prompts/prd-chatbot/promptTemplates');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT error:', err);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

router.post('/prd-chats', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });
        const chatSession = new ChatSession({
            sessionId,
            userId: req.user._id,
            messages: []
        });
        await chatSession.save();
        res.status(201).json(chatSession);
    } catch (error) {
        console.error('Error creating chat session:', error);
        res.status(500).json({ error: 'Failed to create chat session' });
    }
});

router.get('/prd-chats/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        
        if (!chatSession) {
            return res.status(404).json({ error: 'Chat session not found' });
        }
        
        // Ensure title field is present with explicit structure
        const sessionData = {
            _id: chatSession._id,
            sessionId: chatSession.sessionId,
            title: chatSession.title || 'New Chat',
            createdAt: chatSession.createdAt,
            updatedAt: chatSession.updatedAt,
            messages: chatSession.messages,
            progress: chatSession.progress,
            aspectQuestionCounts: chatSession.aspectQuestionCounts,
            questionsAsked: chatSession.questionsAsked,
            uploadedFile: chatSession.uploadedFile,
            uploadedTemplate: chatSession.uploadedTemplate,
            userId: chatSession.userId
        };
        
        res.json(sessionData);
    } catch (error) {
        console.error('Error getting chat session:', error);
        res.status(500).json({ error: 'Failed to get chat session' });
    }
});

// List all chat sessions for the user (without heavy projections by default)
router.get('/prd-chats', authMiddleware, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user._id })
            .select('sessionId title createdAt updatedAt messages')
            .sort({ updatedAt: -1 });
        
        // Transform sessions to ensure title field is always present
        const sessionsWithTitle = sessions.map(session => {
            const sessionData = {
                _id: session._id,
                sessionId: session.sessionId,
                title: session.title || 'New Chat',
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messages: session.messages
            };
            return sessionData;
        });
        
        res.json(sessionsWithTitle);
    } catch (error) {
        console.error('Error listing chat sessions:', error);
        res.status(500).json({ error: 'Failed to list chat sessions' });
    }
});

router.delete('/prd-chats/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        await ChatSession.findOneAndDelete({ sessionId, userId: req.user._id });
        res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Error deleting chat session:', error);
        res.status(500).json({ error: 'Failed to delete chat session' });
    }
});

router.put('/prd-chats/:sessionId/messages', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { content, aspect } = req.body;
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        chatSession.messages.push({ content, sender: 'user', timestamp: new Date() });

        // Optionally update aspect counts if aspect provided
        if (aspect) {
            if (!chatSession.aspectQuestionCounts) chatSession.aspectQuestionCounts = {};
            const current = Number(chatSession.aspectQuestionCounts[aspect] || 0);
            chatSession.aspectQuestionCounts[aspect] = Math.min(current + 1, 3);

            const aspects = [
                'Product vision and goals',
                'User needs and requirements',
                'Target users and use cases',
                'Key features and functionality',
                'Success metrics and KPIs',
                'Technical requirements',
                'Business constraints',
                'Timeline and priorities'
            ];
            const completed = aspects.filter(a => Number(chatSession.aspectQuestionCounts[a] || 0) >= 3).length;
            chatSession.progress = Math.min(completed * 12.5, 100);
        }

        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error adding message to chat session:', error);
        res.status(500).json({ error: 'Failed to add message to chat session' });
    }
});

// Save bot message
router.put('/prd-chats/:sessionId/bot', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { content, aspect } = req.body;
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        chatSession.messages.push({ content, sender: 'bot', timestamp: new Date() });

        // Update aspect counts and progress when bot asks a question for a specific aspect
        if (aspect) {
            if (!chatSession.aspectQuestionCounts) chatSession.aspectQuestionCounts = {};
            const current = Number(chatSession.aspectQuestionCounts[aspect] || 0);
            chatSession.aspectQuestionCounts[aspect] = Math.min(current + 1, 3);

            const aspects = [
                'Product vision and goals',
                'User needs and requirements',
                'Target users and use cases',
                'Key features and functionality',
                'Success metrics and KPIs',
                'Technical requirements',
                'Business constraints',
                'Timeline and priorities'
            ];
            const completed = aspects.filter(a => Number(chatSession.aspectQuestionCounts[a] || 0) >= 3).length;
            chatSession.progress = Math.min(completed * 12.5, 100);
        }

        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error adding bot message:', error);
        res.status(500).json({ error: 'Failed to add bot message' });
    }
});

// Update conversation state
router.put('/prd-chats/:sessionId/conversation-state', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionsAsked, aspectQuestionCounts } = req.body;
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        if (questionsAsked !== undefined) chatSession.questionsAsked = questionsAsked;
        if (aspectQuestionCounts !== undefined) chatSession.aspectQuestionCounts = aspectQuestionCounts;

        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error updating conversation state:', error);
        res.status(500).json({ error: 'Failed to update conversation state' });
    }
});

// Update uploaded file and template data
router.put('/prd-chats/:sessionId/uploaded-data', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { uploadedFile, uploadedTemplate } = req.body;
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        if (uploadedFile !== undefined) chatSession.uploadedFile = uploadedFile;
        if (uploadedTemplate !== undefined) chatSession.uploadedTemplate = uploadedTemplate;

        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error updating uploaded data:', error);
        res.status(500).json({ error: 'Failed to update uploaded data' });
    }
});

// Update chat title
router.put('/prd-chats/:sessionId/title', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title } = req.body;
        
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const chatSession = await ChatSession.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        chatSession.title = title.trim();
        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error updating chat title:', error);
        res.status(500).json({ error: 'Failed to update chat title' });
    }
});

// PRD Chatbot Prompt Endpoints
router.post('/prd-chats/prompts/template-analysis', authMiddleware, async (req, res) => {
    try {
        const { content, fileName } = req.body;
        if (!content || !fileName) {
            return res.status(400).json({ error: 'Content and fileName are required' });
        }
        
        const prompt = prdChatbotPrompts.buildTemplateAnalysisPrompt(content, fileName);
        res.json({ prompt });
    } catch (error) {
        console.error('Error generating template analysis prompt:', error);
        res.status(500).json({ error: 'Failed to generate template analysis prompt' });
    }
});

router.post('/prd-chats/prompts/file-analysis', authMiddleware, async (req, res) => {
    try {
        const { content, fileName } = req.body;
        if (!content || !fileName) {
            return res.status(400).json({ error: 'Content and fileName are required' });
        }
        
        const prompt = prdChatbotPrompts.buildFileAnalysisPrompt(content, fileName);
        res.json({ prompt });
    } catch (error) {
        console.error('Error generating file analysis prompt:', error);
        res.status(500).json({ error: 'Failed to generate file analysis prompt' });
    }
});

router.post('/prd-chats/prompts/next-question', authMiddleware, async (req, res) => {
    try {
        const { conversationHistory, currentState, templateAnalysis } = req.body;
        if (!conversationHistory || !currentState) {
            return res.status(400).json({ error: 'conversationHistory and currentState are required' });
        }
        
        const prompt = prdChatbotPrompts.buildNextQuestionPrompt(conversationHistory, currentState, templateAnalysis);
        res.json({ prompt });
    } catch (error) {
        console.error('Error generating next question prompt:', error);
        res.status(500).json({ error: 'Failed to generate next question prompt' });
    }
});

router.post('/prd-chats/prompts/comprehensive-prd', authMiddleware, async (req, res) => {
    try {
        const { conversationHistory, selectedTemplate } = req.body;
        if (!conversationHistory) {
            return res.status(400).json({ error: 'conversationHistory is required' });
        }
        
        let prompt;
        if (selectedTemplate && selectedTemplate.content) {
            // Use template-based prompt when template is selected
            prompt = prdChatbotPrompts.buildPRDFromTemplatePrompt(conversationHistory, selectedTemplate);
        } else {
            // Use comprehensive prompt when no template is selected
            prompt = prdChatbotPrompts.buildComprehensivePRDPrompt(conversationHistory);
        }
        
        // console.log(prompt);
        res.json({ prompt });
    } catch (error) {
        console.error('Error generating comprehensive PRD prompt:', error);
        res.status(500).json({ error: 'Failed to generate comprehensive PRD prompt' });
    }
});

module.exports = router;