import { apiService } from './api'

// Keep the same interface for backward compatibility
interface GeminiAnalysisResult {
  description: string
  textFound?: string
  currency?: string
  error?: string
}

export class GeminiService {
  async analyzeImage(base64Image: string, customPrompt?: string): Promise<GeminiAnalysisResult> {
    try {
      const response = await apiService.analyzeImage({
        imageBase64: base64Image,
        prompt: customPrompt
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return {
        description: response.description,
        textFound: response.detectedText || '',
        currency: response.currency || ''
      }
      
    } catch (error) {
      console.error('Gemini API error:', error)
      return {
        description: '',
        error: error instanceof Error ? error.message : 'Failed to analyze image'
      }
    }
  }
}
