import axios from 'axios';

/**
 * Analyzes an image for Drishti visual assistant via Proxy
 * @param {string} base64Image - Base64 encoded image data (without data URL prefix)
 * @param {string} customPrompt - Optional custom prompt
 */
const analyzeImageForDrishti = async (base64Image, customPrompt = '') => {
    try {
        const startTime = Date.now();

        // Call proxy service instead of direct Gemini
        const proxyUrl = process.env.PROXY_URL || 'http://localhost:3002';
        
        const response = await axios.post(`${proxyUrl}/v1/ai/drishti`, {
            imageBase64: `data:image/jpeg;base64,${base64Image}`,
            customPrompt
        }, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const analysisTime = Date.now() - startTime;

        if (!response.data.success) {
            throw new Error(response.data.error || 'AI service failed');
        }

        return {
            description: response.data.description,
            detectedText: response.data.detectedText || '',
            currency: response.data.currency || '',
            analysisTime,
            provider: response.data.provider,
            rawResponse: response.data.rawResponse
        };

    } catch (error) {
        console.error('Drishti Proxy Error:', error);
        
        // Handle different types of errors
        if (error.code === 'ECONNREFUSED') {
            return {
                description: 'AI service is temporarily unavailable. Please try again later.',
                detectedText: '',
                currency: '',
                error: 'Proxy service not running',
                analysisTime: 0
            };
        }
        
        if (error.code === 'ECONNABORTED') {
            return {
                description: 'Analysis timed out. Please try again.',
                detectedText: '',
                currency: '',
                error: 'Request timeout',
                analysisTime: 0
            };
        }

        return {
            description: 'Failed to analyze image. Please try again.',
            detectedText: '',
            currency: '',
            error: error.message || 'Unknown error',
            analysisTime: 0
        };
    }
};

export default analyzeImageForDrishti;
