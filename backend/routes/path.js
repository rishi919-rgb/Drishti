import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * @route   POST /api/path
 * @desc    Analyze image for path detection (forward to Python service)
 * @access  Public
 */
router.post('/', async (req, res) => {
    console.log(`[PATH SERVICE] POST request received at /api/drishti/path`);
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        const pathServiceUrl = process.env.PATH_SERVICE_URL || 'http://localhost:5003';
        
        const axiosOptions = {
            timeout: 15000, 
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            headers: { 'Content-Type': 'application/json' }
        };

        const payload = {
            image: imageBase64,
            imageBase64: imageBase64
        };

        console.log(`[PATH PROXY] Initiating POST to ${pathServiceUrl}/path. Payload size: ${imageBase64 ? imageBase64.length : 0} bytes`);
        try {
            // Strictly enforce /path connection only
            const response = await axios.post(`${pathServiceUrl}/path`, payload, axiosOptions);
            console.log(`[PATH PROXY] Success from /path. Status: ${response.status}`);
            
            return res.json({
                success: true,
                objects: response.data.objects || [],
                guidance: response.data.guidance || "Clear path ahead",
                walkable_mask: response.data.walkable_mask || null
            });
            
        } catch (error) {
            console.error('[PATH PROXY] Backend Proxy Exception Raised:', error.message);
            
            // If the python server actively threw an error (e.g. 400 Bad Request, 500 Script crash)
            if (error.response) {
                console.log(`[PATH PROXY] Passing native py-server status ${error.response.status} through the proxy...`);
                return res.status(error.response.status).json(error.response.data);
            }
            
            // If PyTorch is completely offline or models are downloading (ECONNREFUSED)
            return res.status(503).json({
                success: false,
                message: "Path detection service is unreachable or models are still downloading in the terminal.",
                error: error.message
            });
        }
    } catch (outerError) {
        console.error('[PATH PROXY] CRITICAL Outer Endpoint Error:', outerError.message || outerError);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error within Node Path Proxy.",
            error: outerError.message
        });
    }
});

export default router;
