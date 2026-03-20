import express from 'express';
import analyzeImageForDrishti from '../services/drishtiGemini.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Analysis from '../models/Analysis.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/drishti/analyze
 * Analyze an image using Gemini AI (no auth required for anonymous use)
 * Body: { imageBase64: string, prompt?: string }
 */
router.post('/analyze', async (req, res) => {
    try {
        const { imageBase64, prompt } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ 
                message: 'Image data is required' 
            });
        }

        // Clean base64 data (remove data URL prefix if present)
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        // Call Gemini service
        const analysis = await analyzeImageForDrishti(cleanBase64, prompt);

        res.json(analysis);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ 
            message: 'Failed to analyze image',
            error: error.message 
        });
    }
});

/**
 * POST /api/drishti/save
 * Save analysis to user history (auth required)
 * Body: { imageBase64: string, description: string, detectedText: string, currency: string, prompt: string }
 */
router.post('/save', protect, async (req, res) => {
    try {
        const { imageBase64, description, detectedText, currency, prompt } = req.body;

        if (!description) {
            return res.status(400).json({ 
                message: 'Description is required' 
            });
        }

        // Create analysis record
        const analysis = new Analysis({
            userId: req.user._id,
            description,
            detectedText: detectedText || '',
            currency: currency || '',
            imageUrl: imageBase64, // Store base64 image (consider cloud storage in production)
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            tags: []
        });

        await analysis.save();

        res.json({
            message: 'Analysis saved successfully',
            publicId: analysis.publicId,
            id: analysis._id
        });

    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ 
            message: 'Failed to save analysis',
            error: error.message 
        });
    }
});

/**
 * GET /api/drishti/history
 * Get user's analysis history (auth required)
 * Query: page, limit
 */
router.get('/history', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const analyses = await Analysis.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-imageUrl -__v'); // Exclude large image data from list

        const total = await Analysis.countDocuments({ userId: req.user._id });

        res.json({
            analyses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ 
            message: 'Failed to get history',
            error: error.message 
        });
    }
});

/**
 * GET /api/drishti/report/:publicId
 * Get public analysis by public ID (no auth required)
 */
router.get('/report/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        
        const analysis = await Analysis.findOne({ publicId })
            .select('-imageUrl -__v -ipAddress -userAgent');

        if (!analysis) {
            return res.status(404).json({ 
                message: 'Analysis not found' 
            });
        }

        res.json({
            description: analysis.description,
            detectedText: analysis.detectedText,
            currency: analysis.currency,
            createdAt: analysis.createdAt,
            publicId: analysis.publicId
        });

    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ 
            message: 'Failed to get report',
            error: error.message 
        });
    }
});

/**
 * GET /api/drishti/analysis/:id
 * Get full analysis by ID (auth required)
 */
router.get('/analysis/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysis = await Analysis.findOne({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!analysis) {
            return res.status(404).json({ 
                message: 'Analysis not found' 
            });
        }

        res.json(analysis);

    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ 
            message: 'Failed to get analysis',
            error: error.message 
        });
    }
});

/**
 * DELETE /api/drishti/analysis/:id
 * Delete analysis by ID (auth required)
 */
router.delete('/analysis/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await Analysis.findOneAndDelete({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!result) {
            return res.status(404).json({ 
                message: 'Analysis not found' 
            });
        }

        res.json({
            success: true,
            message: 'Analysis deleted successfully'
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            message: 'Failed to delete analysis',
            error: error.message 
        });
    }
});

/**
 * POST /api/drishti/auth/register
 * Register a new user
 */
router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'Name, email, and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email already exists' 
            });
        }

        // Create user (password will be hashed by pre-save middleware)
        const user = new User({
            name,
            email,
            password
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Failed to register user',
            error: error.message 
        });
    }
});

/**
 * POST /api/drishti/auth/login
 * Login user
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Failed to login',
            error: error.message 
        });
    }
});

export default router;
