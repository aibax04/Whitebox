# SquadRunAI

SquadRunAI is a comprehensive AI-powered development platform that provides code analysis, documentation generation, strategic planning, and various developer tools to enhance productivity and code quality.

## Features

### 1. Code Inspector
Advanced code analysis tool that inspects repositories, identifies issues, and provides detailed code quality insights.

### 2. Document Creator
Generate comprehensive business requirements documents (BRDs), technical documentation, and feature-specific README files from codebases.

### 3. SquadBot
AI-powered chatbot assistant that provides intelligent codebase assistance, answers questions, and helps with development tasks.

### 4. PRD Chatbot (Requirement Assistant)
Interactive Product Requirements Document assistant that guides users through structured requirements gathering and generates professional PRDs.

### 5. Diagram Generation
Automatically generate architecture diagrams, flowcharts, and system diagrams from codebase analysis.

### 6. Strategic Planner
Strategic planning tool that helps analyze codebases and create strategic roadmaps for product development.

### 7. ROI Calculator
Calculate and analyze Return on Investment metrics for development projects and features.

### 8. Code Analysis
Deep code analysis with quality scoring, complexity metrics, and actionable recommendations for improvement.

### 9. Code Completion
AI-powered code completion that suggests code snippets and helps developers write code faster.

### 10. Code Refactoring
Intelligent code refactoring assistance that suggests improvements and helps modernize codebases.

### 11. Test Generation
Automated test generation for codebases, including unit tests, integration tests, and test coverage analysis.

### 12. API Planning
Comprehensive API design and planning tool that generates detailed API specifications, endpoints, and implementation guides.

### 13. Repository Embedding
Semantic search capabilities by embedding repositories into vector databases for intelligent code search and retrieval.

### 14. Quality Scores
Code quality scoring system that evaluates codebases across multiple dimensions and provides quality metrics.

### 15. Dashboard & Analytics
Comprehensive dashboard showing statistics, document generation history, and activity tracking.

### 16. Document Approval Workflow
Multi-level document approval system with role-based access control for document review and approval.

### 17. Role Management
User role and permission management system with support for user, admin, and superadmin roles.

### 18. GitHub Integration
Seamless GitHub integration with OAuth authentication, repository browsing, and file content retrieval.

## Deployment

### Architecture
- **Backend**: Node.js/Express server (default port: 3000, configurable via `PORT` environment variable)
- **Frontend**: React application built with Vite (development port: 8080, production build in `dist/`)
- **Database**: MongoDB for user data, document metadata, and application state
- **Vector Database**: Qdrant vector database (Docker container, port 6333) for semantic search
- **File Storage**: AWS S3 for storing generated documents and files

### Deployment Instructions

#### Prerequisites
- Node.js (v18 or higher)
- MongoDB instance
- Docker (for Qdrant)
- AWS account with S3 bucket configured

#### Backend Deployment
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Credentials section below)

4. Start the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

#### Frontend Deployment
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Credentials section below)

4. For development:
   ```bash
   npm run dev
   ```

5. For production build:
   ```bash
   npm run build
   ```
   The built files will be in the `dist/` directory, ready to be served by a web server.

#### Qdrant Vector Database
1. Navigate to the docker directory:
   ```bash
   cd docker/qdrant
   ```

2. Start Qdrant using Docker Compose:
   ```bash
   docker-compose up -d
   ```

   This will start Qdrant on port 6333 with persistent storage in `qdrant_storage/`.

#### Production Deployment
- Backend can be deployed on platforms like Heroku, AWS EC2, DigitalOcean, or any Node.js hosting service
- Frontend can be deployed on Vercel, Netlify, AWS S3 + CloudFront, or any static hosting service
- Ensure environment variables are properly configured in your hosting platform
- MongoDB can be hosted on MongoDB Atlas or self-hosted
- Qdrant can be deployed as a Docker container or use Qdrant Cloud

## Credentials

All credentials and API keys are stored in environment variable files (`.env` files) which are excluded from version control via `.gitignore`.

### Backend Credentials (`backend/.env`)
The following environment variables need to be configured:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `GEMINI_API_KEY` - Google Gemini API key for AI features
- `AWS_ACCESS_KEY_ID` - AWS access key for S3
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET` - S3 bucket name for file storage
- `GITHUB_CLIENT_ID` - GitHub OAuth application client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth application client secret
- `GITHUB_REDIRECT_URI` - GitHub OAuth redirect URI
- `AZURE_CLIENT_ID` - Azure AD application client ID
- `AZURE_CLIENT_SECRET` - Azure AD application client secret
- `AZURE_REDIRECT_URI` - Azure AD redirect URI
- `AZURE_AUTHORITY` - Azure AD authority URL
- `FRONTEND_URL` - Frontend application URL (e.g., http://localhost:8080)
- `PORT` - Backend server port (default: 3000)
- `SUPERADMIN_USERNAME` - Email of the superadmin user
- `QDRANT_URL` - Qdrant server URL (default: http://localhost:6333)
- `QDRANT_API_KEY` - Qdrant API key (optional, for cloud instances)
- `IS_SECURED` - Whether to use secure cookies (true/false)

### Frontend Credentials
Frontend environment variables should be set in `.env` or `.env.local`:

- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID for authentication

### Security Notes
- Never commit `.env` files to version control
- Use secure, randomly generated values for `JWT_SECRET`
- Rotate API keys regularly
- Use environment-specific credentials for different deployment environments
- Store production credentials securely using your hosting platform's secret management features

## Clients

**Note**: Client information should be updated here as needed. Currently, the application supports multi-tenant usage with role-based access control, allowing multiple organizations and users to use the platform.

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **AI/ML**: Google Gemini API, Qdrant Vector Database
- **Storage**: AWS S3, MongoDB
- **Authentication**: JWT, GitHub OAuth, Azure AD OAuth, Google OAuth
- **Vector Search**: Qdrant

## License

[Add license information here]


