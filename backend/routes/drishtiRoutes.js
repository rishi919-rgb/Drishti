import express from 'express';
import DrishtiAnalysis from '../models/DrishtiAnalysis.js';
import analyzeImageForDrishti from '../services/drishtiGemini.js';
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

        // Extract base64 data if it's a data URL
        let base64Data = imageBase64;
        if (imageBase64.includes(',')) {
            base64Data = imageBase64.split(',')[1];
        }

        // Analyze the image
        const analysis = await analyzeImageForDrishti(base64Data, prompt);

        if (analysis.error) {
            return res.status(500).json({ 
                message: 'Analysis failed', 
                error: analysis.error 
            });
        }

        // Log the request (for analytics)
        console.log('Drishti analysis completed:', {
            timestamp: new Date().toISOString(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            analysisTime: analysis.analysisTime
        });

        res.json({
            description: analysis.description,
            detectedText: analysis.detectedText,
            currency: analysis.currency,
            analysisTime: analysis.analysisTime
        });

    } catch (error) {
        console.error('Drishti analyze error:', error);
        res.status(500).json({ 
            message: 'Server error during analysis' 
        });
    }
});

/**
 * POST /api/drishti/save
 * Save an analysis to user's history (auth required)
 * Body: { imageBase64: string, description: string, detectedText?: string, currency?: string, prompt?: string }
 */
router.post('/save', protect, async (req, res) => {
    try {
        const { imageBase64, description, detectedText, currency, prompt } = req.body;

        if (!imageBase64 || !description) {
            return res.status(400).json({ 
                message: 'Image and description are required' 
            });
        }

        // Create new analysis record
        const analysis = new DrishtiAnalysis({
            user: req.user._id,
            imageBase64,
            description,
            detectedText: detectedText || '',
            currency: currency || '',
            prompt: prompt || '',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        await analysis.save();

        res.status(201).json({
            message: 'Analysis saved successfully',
            publicId: analysis.publicId,
            id: analysis._id
        });

    } catch (error) {
        console.error('Drishti save error:', error);
        res.status(500).json({ 
            message: 'Server error while saving analysis' 
        });
    }
});

/**
 * GET /api/drishti/history
 * Get user's analysis history (auth required)
 * Query: ?page=1&limit=10
 */
router.get('/history', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const analyses = await DrishtiAnalysis.find({ user: req.user._id })
            .select('-imageBase64') // Exclude image data for performance
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await DrishtiAnalysis.countDocuments({ user: req.user._id });

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
        console.error('Drishti history error:', error);
        res.status(500).json({ 
            message: 'Server error while fetching history' 
        });
    }
});

/**
 * GET /api/drishti/report/:publicId
 * Get public analysis details (no auth required)
 */
router.get('/report/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;

        const analysis = await DrishtiAnalysis.findOne({ publicId })
            .select('description detectedText currency createdAt')
            .lean();

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
            publicId
        });

    } catch (error) {
        console.error('Drishti report error:', error);
        res.status(500).json({ 
            message: 'Server error while fetching report' 
        });
    }
});

/**
 * GET /api/drishti/analysis/:id
 * Get full analysis details including image (auth required, user must own it)
 */
router.get('/analysis/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const analysis = await DrishtiAnalysis.findOne({ 
            _id: id, 
            user: req.user._id 
        });

        if (!analysis) {
            return res.status(404).json({ 
                message: 'Analysis not found or access denied' 
            });
        }

        res.json(analysis);

    } catch (error) {
        console.error('Drishti get analysis error:', error);
        res.status(500).json({ 
            message: 'Server error while fetching analysis' 
        });
    }
});

/**
 * DELETE /api/drishti/analysis/:id
 * Delete an analysis (auth required, user must own it)
 */
router.delete('/analysis/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await DrishtiAnalysis.deleteOne({ 
            _id: id, 
            user: req.user._id 
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                message: 'Analysis not found or access denied' 
            });
        }

        res.json({ 
            message: 'Analysis deleted successfully' 
        });

    } catch (error) {
        console.error('Drishti delete error:', error);
        res.status(500).json({ 
            message: 'Server error while deleting analysis' 
        });
    }
});

export default router;
