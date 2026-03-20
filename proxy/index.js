import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import AIProviderManager from './services/aiProviderManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize AI Provider Manager
const aiManager = new AIProviderManager();

// CORS configuration
const allowedOrigins = [
    'http://localhost:5001', // Drishti backend
    'http://localhost:5173', // Frontend development
    'http://localhost:5174', // Frontend development
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: aiManager.getProviderStatus()
    });
});

// Provider status endpoint
app.get('/status', (req, res) => {
    res.json({
        providers: aiManager.getProviderStatus(),
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /v1/ai
 * Main AI analysis endpoint
 * Body: {
 *   taskType: 'vision' | 'text' (default: 'vision'),
 *   prompt: string,
 *   imageBase64?: string (required for vision tasks)
 * }
 */
app.post('/v1/ai', async (req, res) => {
    try {
        const { taskType = 'vision', prompt, imageBase64 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: 'Prompt is required',
                code: 'MISSING_PROMPT'
            });
        }

        if (taskType === 'vision' && !imageBase64) {
            return res.status(400).json({
                error: 'Image is required for vision tasks',
                code: 'MISSING_IMAGE'
            });
        }

        const startTime = Date.now();
        
        try {
            const response = await aiManager.analyzeImage(prompt, imageBase64, taskType);
            const analysisTime = Date.now() - startTime;

            res.json({
                success: true,
                result: response.result,
                provider: response.provider,
                usage: response.usage,
                rpm: response.rpm,
                analysisTime,
                timestamp: new Date().toISOString()
            });

        } catch (aiError) {
            console.error('AI Provider Error:', aiError);
            
            // Return a helpful error response
            res.status(503).json({
                success: false,
                error: 'AI service temporarily unavailable',
                details: aiError.message,
                providerStatus: aiManager.getProviderStatus(),
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /v1/ai/drishti
 * Specialized endpoint for Drishti with predefined prompt
 */
app.post('/v1/ai/drishti', async (req, res) => {
    try {
        const { imageBase64, customPrompt } = req.body;

        if (!imageBase64) {
            return res.status(400).json({
                error: 'Image is required',
                code: 'MISSING_IMAGE'
            });
        }

        const prompt = customPrompt || `You are an AI assistant for a visually impaired person. Analyze this image and provide a clear, simple description in 1-2 sentences.

Focus on:
1. Main objects and people in the scene
2. Important text that's visible (read it clearly)
3. If Indian currency is visible, identify the denomination
4. Any potential obstacles or safety concerns

Respond in this exact format:
DESCRIPTION: [simple description of the scene]
TEXT: [any text you can read, or "No text found"]
CURRENCY: [Indian currency denomination if visible, or "No currency detected"]

Keep descriptions simple and practical for someone who cannot see the image.`;

        const startTime = Date.now();
        
        try {
            const response = await aiManager.analyzeImage(prompt, imageBase64, 'vision');
            const analysisTime = Date.now() - startTime;

            // Parse the structured response
            const parsed = parseDrishtiResponse(response.result);

            res.json({
                success: true,
                ...parsed,
                provider: response.provider,
                usage: response.usage,
                rpm: response.rpm,
                analysisTime,
                rawResponse: response.result,
                timestamp: new Date().toISOString()
            });

        } catch (aiError) {
            console.error('AI Provider Error:', aiError);
            
            res.status(503).json({
                success: false,
                error: 'AI service temporarily unavailable',
                details: aiError.message,
                providerStatus: aiManager.getProviderStatus(),
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Parse structured response from Drishti prompt
 */
function parseDrishtiResponse(responseText) {
    const result = {
        description: '',
        detectedText: '',
        currency: ''
    };

    const lines = responseText.split('\n').map(line => line.trim());
    
    lines.forEach(line => {
        if (line.startsWith('DESCRIPTION:')) {
            result.description = line.replace('DESCRIPTION:', '').trim();
        } else if (line.startsWith('TEXT:')) {
            const text = line.replace('TEXT:', '').trim();
            result.detectedText = text === 'No text found' ? '' : text;
        } else if (line.startsWith('CURRENCY:')) {
            const currency = line.replace('CURRENCY:', '').trim();
            result.currency = currency === 'No currency detected' ? '' : currency;
        }
    });

    // If structured parsing failed, use the full response as description
    if (!result.description) {
        result.description = responseText;
    }

    return result;
}

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    aiManager.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    aiManager.destroy();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Drishti AI Proxy Server running on port ${PORT}`);
    console.log(`📊 Provider status:`, aiManager.getProviderStatus());
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Status endpoint: http://localhost:${PORT}/status`);
});
