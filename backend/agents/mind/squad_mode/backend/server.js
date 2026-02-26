const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const FileMetadata = require('./data_models/file');
const { router: documentsRoutes, authMiddleware } = require('./routes/documents');
const sharingRoutes = require('./routes/sharing_route');
const roiRoutes = require('./routes/roi');
const roadmapRoutes = require('./routes/roadmap');
const taskRoutes = require('./routes/task');
const dashboardRoutes = require('./routes/dashboard');
const promptsRoutes = require('./routes/prompts');
const prdChatRoutes = require('./routes/prd_chat_route');
const advancedAnalysisRoutes = require('./routes/advancedAnalysis');
const templateRoutes = require('./routes/template');
const qualityScoresRoutes = require('./routes/quality_scores');
const diagramRoutes = require('./routes/diagrams');
const strategicPlannerRoutes = require('./routes/strategic_planner');
const dashboardAnalysisRoutes = require('./routes/dashboard_analysis');
const testGenerationRoutes = require('./routes/test_generation');
const codeAnalysisRoutes = require('./routes/code_analysis_route');
const documentGenerationRoutes = require('./routes/document_generation_route');
const chatbotAnalysisRoutes = require('./routes/chatbot_analysis');
const squadbotChatRoutes = require('./routes/squadbot_chat_route');
const refactoringRoutes = require('./routes/refactoring_route');
const codeCompletionRoutes = require('./routes/code_completion_route');
const prdAnalysisRoutes = require('./routes/prd_analysis_route');
const apiPlanRoutes = require('./routes/api_plan_route');
const repoEmbeddingRoutes = require('./routes/repo_embedding_route');

require('dotenv').config();

const app = express();
app.use(cors({
    origin: `${process.env.FRONTEND_URL || 'http://localhost:8080'}`,
    credentials: true
}));

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
});
// console.log('S3 Client initialized with region:', process.env.AWS_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.AWS_S3_BUCKET);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Server will continue running in limited mode without DB persistence.');
    });
} else {
  console.warn('MONGODB_URI is not defined. Running in limited mode without DB persistence.');
}

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', documentsRoutes);
app.use('/api', sharingRoutes);
app.use('/api', roiRoutes);
app.use('/api', roadmapRoutes);
app.use('/api', taskRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api', prdChatRoutes);
app.use('/api/advanced-analysis', advancedAnalysisRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api', qualityScoresRoutes);
app.use('/api/diagrams', diagramRoutes);
app.use('/api/strategic-planner', strategicPlannerRoutes);
app.use('/api/dashboard-analysis', dashboardAnalysisRoutes);
app.use('/api/test-generation', testGenerationRoutes);
app.use('/api/code-analysis', codeAnalysisRoutes);
app.use('/api/document-generation', documentGenerationRoutes);
app.use('/api/chatbot-analysis', chatbotAnalysisRoutes);
app.use('/api', squadbotChatRoutes);
app.use('/api/refactoring', refactoringRoutes);
app.use('/api/code-completion', codeCompletionRoutes);
app.use('/api/prd-analysis', prdAnalysisRoutes);
app.use('/api/api-plan', apiPlanRoutes);
app.use('/api/repo-embedding', repoEmbeddingRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'Backend is running' });
});

// PDF text extraction endpoint
const upload = multer();
app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
    try {
        const buffer = req.file?.buffer;
        if (!buffer) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const data = await pdfParse(buffer);
        const text = (data.text || '').trim();
        return res.json({ text });
    } catch (error) {
        console.error('PDF parse error:', error);
        return res.status(500).json({ error: 'Failed to parse PDF' });
    }
});

app.post('/api/get-presigned-url', authMiddleware, async (req, res) => {
    const { filename, fileName } = req.body || {};
    const key = filename || fileName;
    const contentType = "application/pdf";
    if (!key) {
        return res.status(400).json({ error: 'filename or fileName is required' });
    }
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        ContentType: contentType
    });
    console.log(`Generating presigned URL for file: ${key} with content type: ${contentType}`);
    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        // Save metadata in MongoDB 
        let status = '';
        if (req.user.role === 'user') status = 'Pending-User';
        else if (req.user.role === 'admin') status = 'Pending-Admin';
        else if (req.user.role === 'superadmin') status = 'Pending-Superadmin';
        else status = 'Pending-User';

        let metadata = await FileMetadata.findOne({ fileName: key, generatedBy: req.user._id });
        if (!metadata) {
            metadata = new FileMetadata({
                fileName: key,
                s3Key: key,
                generatedBy: req.user._id,
                currentStatus: status,
                sharedUserIds: [req.user._id],
                // remarks: [] // If you have remarks in schema, add here
            });
        } else {
            metadata.currentStatus = status;
            metadata.s3Key = key;
            if (!metadata.sharedUserIds.includes(req.user._id)) {
                metadata.sharedUserIds.push(req.user._id);
            }
        }
        await metadata.save();
        res.json({ url, metadata });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
});

// Upload file to S3 through backend to avoid CORS issues
app.post('/api/upload-to-s3', authMiddleware, async (req, res) => {
    const { filename, fileName, fileContent, filetype } = req.body || {};
    const key = filename || fileName;
    const contentType = filetype || "application/pdf";
    
    if (!key) {
        return res.status(400).json({ error: 'filename or fileName is required' });
    }
    
    if (!fileContent) {
        return res.status(400).json({ error: 'fileContent is required' });
    }

    try {
        // Convert base64 to buffer if needed
        let fileBuffer;
        if (typeof fileContent === 'string') {
            // Assume base64 encoded
            fileBuffer = Buffer.from(fileContent, 'base64');
        } else {
            fileBuffer = Buffer.from(fileContent);
        }

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            ContentType: contentType,
            Body: fileBuffer
        });

        await s3Client.send(command);

        // Save metadata in MongoDB
        let status = '';
        if (req.user.role === 'user') status = 'Pending-User';
        else if (req.user.role === 'admin') status = 'Pending-Admin';
        else if (req.user.role === 'superadmin') status = 'Pending-Superadmin';
        else status = 'Pending-User';

        let metadata = await FileMetadata.findOne({ fileName: key, generatedBy: req.user._id });
        if (!metadata) {
            metadata = new FileMetadata({
                fileName: key,
                s3Key: key,
                generatedBy: req.user._id,
                currentStatus: status,
                sharedUserIds: [req.user._id],
            });
        } else {
            metadata.currentStatus = status;
            metadata.s3Key = key;
            if (!metadata.sharedUserIds.includes(req.user._id)) {
                metadata.sharedUserIds.push(req.user._id);
            }
        }
        await metadata.save();
        
        res.json({ success: true, metadata });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).json({ error: 'Failed to upload file to S3' });
    }
});

app.use(cookieParser());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const ensureDataDir = async () => {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
};

// Helper function to save GitHub response to JSON file
const saveGitHubResponse = async (responseData, filename) => {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(responseData, null, 2));
    // console.log(`GitHub response saved to: ${filePath}`);
    return filePath;
};

// Helper function to make GitHub API calls with timeout
const fetchGitHubAPI = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('GitHub API request timeout');
        }
        throw error;
    }
};

// (removed) loadGitHubData helper no longer needed

// Helper function to map prompt with GitHub data
const mapPromptWithGitHubData = async (originalPrompt, repoData, fileContents) => {
    // Create a comprehensive prompt that includes GitHub repository information
    let mappedPrompt = `
REPOSITORY ANALYSIS REQUEST:
${originalPrompt}

REPOSITORY STRUCTURE:
Repository: ${repoData.owner}/${repoData.repo}
Branch: ${repoData.branch || 'main'}
Total Files: ${repoData.tree ? repoData.tree.length : 0}

FILE TREE:
${repoData.tree ? repoData.tree.map(file => `${file.path} (${file.type})`).join('\n') : 'No files found'}

FILE CONTENTS:
${fileContents.map(file => `
=== FILE: ${file.path} ===
${file.content.substring(0, 8000)} ${file.content.length > 8000 ? '...[truncated]' : ''}
`).join('\n')}

ANALYSIS INSTRUCTIONS:
Please analyze the above repository structure and file contents to provide a comprehensive response to the original request.
`;

    return mappedPrompt;
};

app.get('/api/auth/github/login', async (req, res) => {
    try {
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_REDIRECT_URI,
            scope: 'repo read:user user:email read:org read:org repo write: ',
            state: jwt.sign({ t: Date.now() }, process.env.JWT_SECRET, { expiresIn: '10m' })
        });
        res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
    } catch (err) {
        console.error('GitHub login error:', err);
        res.status(500).send('GitHub login failed');
    }
});

app.get('/api/auth/github/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    try {
        try {
            jwt.verify(state, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).send('Invalid OAuth state');
        }
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI
            },
            { headers: { Accept: 'application/json' } }
        );
        const githubAccessToken = tokenRes.data.access_token;
        if (!githubAccessToken) {
            return res.status(400).send('Failed to obtain GitHub token');
        }
        const ghUserRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${githubAccessToken}`, Accept: 'application/vnd.github.v3+json' }
        });
        const ghUser = await ghUserRes.json();
        if (!ghUser || !ghUser.id) {
            return res.status(400).send('Failed to fetch GitHub user');
        }
        let email = ghUser.email;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `token ${githubAccessToken}`, Accept: 'application/vnd.github.v3+json' }
            });
            if (emailsRes.ok) {
                const emails = await emailsRes.json();
                const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) : null;
                email = primary?.email || (Array.isArray(emails) && emails[0]?.email) || null;
            }
        }
        const name = ghUser.name || ghUser.login || '';
        const picture = ghUser.avatar_url || '';
        const githubId = String(ghUser.id);
        const githubUsername = ghUser.login || null;
        const User = require('./data_models/roles');
        let user = null;
        if (email) {
            user = await User.findOne({ email });
        }
        if (!user) {
            user = await User.findOne({ githubId });
        }
        if (!user) {
            let role = 'user';
            if (email && email === process.env.SUPERADMIN_USERNAME?.trim()) {
                role = 'superadmin';
            }
            user = await User.create({ email, name, picture, role, githubAccessToken, githubId, githubUsername });
        } else {
            user.name = name || user.name;
            user.picture = picture || user.picture;
            user.githubAccessToken = githubAccessToken;
            user.githubId = githubId;
            user.githubUsername = githubUsername;
            await user.save();
        }
        const appToken = jwt.sign({
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
        res.redirect(`${FRONTEND_URL}/signin?token=${appToken}`);
    } catch (err) {
        console.error('GitHub callback error:', err);
        res.status(500).send('GitHub authentication failed');
    }
});

app.get('/api/auth/outlook', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.AZURE_REDIRECT_URI,
        response_mode: 'query',
        scope: 'openid email profile User.Read' 
    });
    res.redirect(`${process.env.AZURE_AUTHORITY}/oauth2/v2.0/authorize?${params}`);
});

app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const tokenResponse = await axios.post(`${process.env.AZURE_AUTHORITY}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: process.env.AZURE_CLIENT_ID,
            scope: 'openid email profile User.Read',
            code: code,
            redirect_uri: process.env.AZURE_REDIRECT_URI,
            grant_type: 'authorization_code',
            client_secret: process.env.AZURE_CLIENT_SECRET
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { id_token } = tokenResponse.data;
        const outlookUser = jwt.decode(id_token);
        // Extract user info from id_token
        const email = outlookUser.email || outlookUser.preferred_username;
        const name = outlookUser.name || outlookUser.given_name || '';
        const picture = outlookUser.picture || '';
        if (!email) throw new Error('No email in Outlook token');

        // Find or create user in MongoDB
        const User = require('./data_models/roles');
        let user = await User.findOne({ email });
        if (!user) {
            // Set role on creation only
            let role = 'user';
            if (email === process.env.SUPERADMIN_USERNAME?.trim()) {
                role = 'superadmin';
            }
            user = await User.create({ email, name, picture, role });
        } else {
            // Only update name and picture, never overwrite role
            let updated = false;
            if (user.name !== name) { user.name = name; updated = true; }
            if (user.picture !== picture) { user.picture = picture; updated = true; }
            if (updated) await user.save();
        }

        // Generate app JWT
        const appToken = jwt.sign({
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Redirect to frontend with JWT in URL
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
        res.redirect(`${FRONTEND_URL}/signin?token=${appToken}`);
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).send('Authentication failed');
    }
});

app.get('/api/me', (req, res) => {
    res.set('Cache-Control', 'no-store');
    
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const User = require('./data_models/roles');
            User.findById(decoded.id)
                .then(user => {
                    if (!user) {
                        return res.status(401).json({ error: 'User not found' });
                    }
                    res.json({ 
                        user: {
                            id: user._id,
                            email: user.email,
                            name: user.name,
                            picture: user.picture,
                            role: user.role
                        }
                    });
                })
                .catch(err => {
                    console.error('Error fetching user:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
            return;
        } catch (err) {
            console.error('JWT verification error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    
    // Fallback to cookie-based authentication (for Outlook)
    const token = req.cookies.outlook_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const user = jwt.decode(token);
    res.json({ user });
});

app.post('/api/auth/signout', (req, res) => {
    res.clearCookie('outlook_token', {
        httpOnly: true, 
        secure: process.env.IS_SECURED, // true in production
        sameSite: 'Lax',
        path: '/',
        domain: 'localhost' // comment this line in production
    });
    res.json({ success: true });
});


// Modified Gemini API endpoint with prompt mapping
app.post('/api/generate', async (req, res) => {
    const { prompt, systemInstruction, repoData, fileContents, requestType, language, responseFormat } = req.body;
    
    try {
        let finalPrompt = prompt;
        let finalSystemInstruction = systemInstruction;
        
        // If no system instruction is provided, determine it based on request type
        if (!finalSystemInstruction && requestType) {
            finalSystemInstruction = await determineSystemInstruction(requestType, language);
        }
        
        // If responseFormat is JSON, add strict JSON instruction
        if (responseFormat === 'json') {
            const jsonSystemInstruction = 'You are a JSON API. You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks, no text before or after. Start with { and end with }.';
            finalSystemInstruction = finalSystemInstruction 
                ? `${finalSystemInstruction}\n\n${jsonSystemInstruction}`
                : jsonSystemInstruction;
        }
        
        // If GitHub data is provided, map the prompt
        if (repoData && fileContents) {
            console.log('Mapping prompt with GitHub data...');
            finalPrompt = await mapPromptWithGitHubData(prompt, repoData, fileContents);
            
            // Save the mapped prompt for debugging
            await saveGitHubResponse({
                originalPrompt: prompt,
                mappedPrompt: finalPrompt,
                timestamp: new Date().toISOString()
            }, `mapped_prompt_${Date.now()}.json`);
        }

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: finalPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        };
        
        // Add response_mime_type for JSON mode if supported (Gemini 2.0+)
        if (responseFormat === 'json') {
            requestBody.generationConfig.responseMimeType = 'application/json';
        }
        
        if (finalSystemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: finalSystemInstruction }] };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        let content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        // console.log('Response from Gemini API:', data);
        // console.log('Generated content:', content);
        if (!content) {
            return res.status(500).json({ error: 'No content generated' });
        }
        
        // If JSON format was requested, try to extract JSON from the response
        if (responseFormat === 'json') {
            content = extractJSONFromResponse(content);
        }
        
        res.json({ content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Helper function to extract JSON from response text
function extractJSONFromResponse(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/g, '');
    
    // Try to find JSON object
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart < 0) {
        // No opening brace found - return as is
        return text;
    }
    
    if (jsonStart > 0) {
        cleaned = cleaned.substring(jsonStart);
    }
    
    // Find matching closing brace (accounting for nested braces)
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++;
        if (cleaned[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                lastBrace = i;
                break;
            }
        }
    }
    
    if (lastBrace > 0) {
        cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    cleaned = cleaned.trim();
    
    // Validate it's potentially valid JSON
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        // Try to parse to validate
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch (e) {
            // If parsing fails, return original
            return text;
        }
    }
    
    return text;
}

// Helper function to determine system instruction based on request type
async function determineSystemInstruction(requestType, language = 'javascript') {
    const prompts = require('./prompts');
    
    switch (requestType) {
        case 'business-document':
            return prompts.documentGeneration.systemInstructions.BUSINESS_DOCUMENT_SYSTEM_INSTRUCTION;
        case 'technical-document':
            return prompts.documentGeneration.systemInstructions.TECHNICAL_DOCUMENT_SYSTEM_INSTRUCTION;
        case 'code-quality':
            return prompts.documentGeneration.systemInstructions.CODE_QUALITY_COMPLETENESS_SYSTEM_INSTRUCTION;
        case 'code-analysis':
            return prompts.analysis.systemInstructions.CODE_ANALYSIS_SYSTEM_INSTRUCTION;
        case 'code-analysis-chunk':
            return prompts.analysis.systemInstructions.SIMPLIFIED_CHUNK_ANALYSIS_INSTRUCTION;
        case 'code-analysis-refactored':
            return prompts.analysis.systemInstructions.REFACTORED_CHUNK_ANALYSIS_INSTRUCTION;
        case 'repository-analysis':
            return prompts.analysis.systemInstructions.REPOSITORY_ANALYSIS_SYSTEM_INSTRUCTION;
        case 'code-completion':
            return prompts.codeCompletion.systemInstructions.CODE_COMPLETION_SYSTEM_INSTRUCTION(language);
        case 'refactoring':
            return prompts.refactoring.systemInstructions.REFACTORING_SYSTEM_PROMPT;
        case 'chatbot':
            return prompts.chatbot.systemInstructions.CHATBOT_SYSTEM_INSTRUCTION;
        case 'api-plan':
            return prompts.api.systemInstructions.API_SYSTEM_INSTRUCTION_TEMPLATE;
        case 'test-generation':
            return prompts.testGeneration.systemInstructions.BASE_SYSTEM_PROMPT;
        default:
            return null;
    }
}

// Modified GitHub API endpoints with data saving
app.get('/api/github/branches', async (req, res) => {
    try {
        const owner = req.query.owner;
        const repo = req.query.repo;
        const githubToken = req.query.githubToken;
        if (!owner || !repo) {
            return res.status(400).json({ error: 'Owner and repo are required' });
        }
        let effectiveGithubToken = githubToken;
        if (!effectiveGithubToken && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const appToken = req.headers.authorization.substring(7);
                const decoded = jwt.verify(appToken, process.env.JWT_SECRET);
                const User = require('./data_models/roles');
                const user = await User.findById(decoded.id);
                if (user && user.githubAccessToken) {
                    effectiveGithubToken = user.githubAccessToken;
                }
            } catch (e) {}
        }
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (effectiveGithubToken) headers['Authorization'] = `token ${effectiveGithubToken}`;
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, { headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: errorData.message || 'Failed to fetch branches' });
        }
        const branches = await response.json();
        const list = Array.isArray(branches) ? branches.map(b => ({ name: b.name, commitSha: b.commit?.sha })) : [];
        res.json({ branches: list });
    } catch (error) {
        console.error('GitHub Branches Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/github/repo-files', async (req, res) => {
    const { owner, repo, githubToken, branch: requestedBranch } = req.body;

    if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo are required' });
    }

    try {
        let effectiveGithubToken = githubToken;
        // If no token provided explicitly, try to use the authenticated user's stored GitHub token
        if (!effectiveGithubToken && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const appToken = req.headers.authorization.substring(7);
                const decoded = jwt.verify(appToken, process.env.JWT_SECRET);
                const User = require('./data_models/roles');
                const user = await User.findById(decoded.id);
                if (user && user.githubAccessToken) {
                    effectiveGithubToken = user.githubAccessToken;
                }
            } catch (e) {
                // Ignore token errors, proceed without user token
            }
        }
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (effectiveGithubToken) {
            headers['Authorization'] = `token ${effectiveGithubToken}`;
        }

        let branch = requestedBranch || 'main';
        let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
        if (!response.ok && !requestedBranch) {
            // Fallbacks only if branch not explicitly requested
            response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, { headers });
            branch = 'master';
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ 
                error: errorData.message || "Failed to fetch repository files. Repository may be private or doesn't exist." 
            });
        }
        
        const data = await response.json();
        const responseData = { ...data, branch, owner, repo };
        
        // Save GitHub repository response to JSON file
        const filename = `repo_${owner}_${repo}_${Date.now()}.json`;
        await saveGitHubResponse(responseData, filename);
        
        res.json({ ...responseData, savedFile: filename });
        
    } catch (error) {
        console.error('GitHub API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/github/file-content', async (req, res) => {
    const { owner, repo, path, githubToken } = req.body;

    if (!owner || !repo || !path) {
        return res.status(400).json({ error: 'Owner, repo, and path are required' });
    }

    try {
        let effectiveGithubToken = githubToken;
        if (!effectiveGithubToken && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const appToken = req.headers.authorization.substring(7);
                const decoded = jwt.verify(appToken, process.env.JWT_SECRET);
                const User = require('./data_models/roles');
                const user = await User.findById(decoded.id);
                if (user && user.githubAccessToken) {
                    effectiveGithubToken = user.githubAccessToken;
                }
            } catch (e) {
                // ignore
            }
        }
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (effectiveGithubToken) {
            headers['Authorization'] = `token ${effectiveGithubToken}`;
        }

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ 
                error: errorData.message || "Failed to fetch file content" 
            });
        }
        
        const data = await response.json();
        
        // Save file content response to JSON file
        const filename = `file_${owner}_${repo}_${path.replace(/[\/\\]/g, '_')}_${Date.now()}.json`;
        await saveGitHubResponse({
            ...data,
            owner,
            repo,
            requestedPath: path
        }, filename);
        
        res.json({ ...data, savedFile: filename });
        
    } catch (error) {
        console.error('GitHub File Content Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Batch fetch multiple file contents
app.post('/api/github/files-contents', async (req, res) => {
    const { owner, repo, paths, githubToken } = req.body || {};

    if (!owner || !repo || !Array.isArray(paths) || paths.length === 0) {
        return res.status(400).json({ error: 'Owner, repo, and non-empty paths[] are required' });
    }

    try {
        let effectiveGithubToken = githubToken;
        console.log('Files-contents API - Initial githubToken:', !!githubToken);
        
        if (!effectiveGithubToken && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const appToken = req.headers.authorization.substring(7);
                const decoded = jwt.verify(appToken, process.env.JWT_SECRET);
                const User = require('./data_models/roles');
                const user = await User.findById(decoded.id);
                if (user && user.githubAccessToken) {
                    effectiveGithubToken = user.githubAccessToken;
                    console.log('Files-contents API - Using stored GitHub token for user:', user.email);
                } else {
                    console.log('Files-contents API - No stored GitHub token found for user:', user?.email);
                }
            } catch (e) {
                console.log('Files-contents API - Error getting stored token:', e.message);
            }
        }
        
        console.log('Files-contents API - Effective token available:', !!effectiveGithubToken);
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (effectiveGithubToken) {
            headers['Authorization'] = `token ${effectiveGithubToken}`;
        }

        // Simple concurrency control
        const concurrency = 8;
        const results = [];
        let index = 0;
        
        async function worker() {
            while (index < paths.length) {
                const current = index++;
                const filePath = paths[current];
                try {
                    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        results[current] = {
                            path: filePath,
                            error: errorData.message || 'Failed to fetch file content'
                        };
                        continue;
                    }
                    const data = await response.json();
                    results[current] = {
                        path: filePath,
                        content: data.content,
                        encoding: data.encoding,
                        size: data.size
                    };
                } catch (e) {
                    results[current] = { path: filePath, error: 'Network error' };
                }
            }
        }

        const workers = Array.from({ length: Math.min(concurrency, paths.length) }, () => worker());
        await Promise.all(workers);

        // Optionally save a summary of the batch
        const filename = `batch_files_${owner}_${repo}_${Date.now()}.json`;
        await saveGitHubResponse({ owner, repo, count: paths.length, resultsPreview: results.slice(0, 5) }, filename);

        res.json({ results, savedFile: filename });
    } catch (error) {
        console.error('GitHub Batch File Contents Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// (removed) GET /api/github/saved-data/:filename

// (removed) GET /api/github/saved-files
// Protected endpoint to get repositories for the authenticated user using stored GitHub token
app.get('/api/github/user-repos', authMiddleware, async (req, res) => {
    try {
        const User = require('./data_models/roles');
        const user = await User.findById(req.user._id);
        if (!user || !user.githubAccessToken) {
            return res.status(400).json({ error: 'GitHub not connected' });
        }
        const response = await fetchGitHubAPI('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: errorData.message || 'Failed to fetch repositories' });
        }
        const repos = await response.json();
        res.json(repos);
    } catch (error) {
        console.error('Error fetching user repos:', error);
        if (error.message === 'GitHub API request timeout') {
            res.status(408).json({ error: 'Request timeout - GitHub API is taking too long to respond' });
        } else if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
            res.status(408).json({ error: 'Connection timeout - Unable to reach GitHub API' });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// POST endpoint to get repositories using provided GitHub token
app.post('/api/github/user-repos', async (req, res) => {
    try {
        const { githubToken } = req.body;
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token is required' });
        }
        
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: errorData.message || 'Failed to fetch repositories' });
        }
        
        const repos = await response.json();
        res.json(repos);
    } catch (error) {
        console.error('Error fetching user repos:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST endpoint to push/create/update a file in GitHub repository
app.post('/api/github/push-file', authMiddleware, async (req, res) => {
    try {
        const { owner, repo, path, content, message, branch } = req.body;

        if (!owner || !repo || !path || !content || !message) {
            return res.status(400).json({ error: 'Owner, repo, path, content, and message are required' });
        }

        // Get GitHub token from user
        const User = require('./data_models/roles');
        const user = await User.findById(req.user._id);
        if (!user || !user.githubAccessToken) {
            return res.status(400).json({ error: 'GitHub not connected. Please connect your GitHub account.' });
        }

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${user.githubAccessToken}`,
            'Content-Type': 'application/json'
        };

        // Check if file exists to get SHA for update
        let sha = null;
        const targetBranch = branch || 'main';
        try {
            const existingFileResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${targetBranch}`,
                { headers }
            );
            if (existingFileResponse.ok) {
                const existingFile = await existingFileResponse.json();
                sha = existingFile.sha;
            }
        } catch (e) {
            // File doesn't exist, will create new
        }

        // Encode content to base64
        const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

        // Prepare request body
        const requestBody = {
            message: message,
            content: contentBase64,
            branch: targetBranch
        };

        if (sha) {
            requestBody.sha = sha; // Include SHA for update
        }

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers,
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ 
                error: errorData.message || 'Failed to push file to GitHub' 
            });
        }

        const data = await response.json();
        res.json({ 
            success: true, 
            message: 'File pushed successfully',
            commit: data.commit,
            content: data.content
        });
    } catch (error) {
        console.error('Error pushing file to GitHub:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Save file metadata in MongoDB after S3 upload


// Cleanup function to delete all files in the data directory on process exit
const cleanupDataDir = async () => {
    try {
        await ensureDataDir();
        const files = await fs.readdir(DATA_DIR);
        for (const file of files) {
            await fs.unlink(path.join(DATA_DIR, file));
        }
        console.log('Cleaned up data directory.');
    } catch (err) {
        console.error('Error cleaning up data directory:', err);
    }
};

// Register cleanup on process exit
process.on('SIGINT', async () => {
    await cleanupDataDir();
    process.exit();
});
process.on('SIGTERM', async () => {
    await cleanupDataDir();
    process.exit();
});
process.on('exit', async () => {
    await cleanupDataDir();
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // console.log(`Data will be saved to: ${DATA_DIR}`);
});