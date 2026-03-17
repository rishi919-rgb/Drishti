import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Analyzes an image for Drishti visual assistant
 * @param {string} base64Image - Base64 encoded image data (without data URL prefix)
 * @param {string} customPrompt - Optional custom prompt
 */
const analyzeImageForDrishti = async (base64Image, customPrompt = '') => {
    try {
        const startTime = Date.now();

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

        const contents = [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                ]
            }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents,
            config: { responseMimeType: "text/plain" }
        });

        const analysisTime = Date.now() - startTime;
        const responseText = response.text;

        // Parse the structured response
        const parsed = parseDrishtiResponse(responseText);

        return {
            ...parsed,
            analysisTime,
            rawResponse: responseText
        };

    } catch (error) {
        console.error('Drishti Gemini Error:', error);
        return {
            description: 'Failed to analyze image. Please try again.',
            detectedText: '',
            currency: '',
            error: error.message,
            analysisTime: 0
        };
    }
};

/**
 * Parses the structured response from Gemini
 * @param {string} responseText - Raw response text from Gemini
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

export default analyzeImageForDrishti;
