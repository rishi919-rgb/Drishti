// Mock API service for testing without backend
interface MockAnalysisResponse {
  description: string
  detectedText?: string
  currency?: string
  analysisTime?: number
  error?: string
}

class MockApiService {
  private mockResponses = [
    {
      description: "A person sitting at a desk with a computer and coffee mug.",
      detectedText: "",
      currency: ""
    },
    {
      description: "A smartphone displaying a mobile application interface.",
      detectedText: "Settings",
      currency: ""
    },
    {
      description: "A hand holding Indian currency notes.",
      detectedText: "",
      currency: "₹500"
    },
    {
      description: "A bookshelf filled with books and decorative items.",
      detectedText: "The Great Gatsby",
      currency: ""
    },
    {
      description: "A kitchen counter with utensils and food containers.",
      detectedText: "Salt",
      currency: ""
    }
  ]

  async analyzeImage(request: {
    imageBase64: string
    prompt?: string
  }): Promise<MockAnalysisResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // Return random mock response
    const response = this.mockResponses[Math.floor(Math.random() * this.mockResponses.length)]
    
    return {
      ...response,
      analysisTime: Math.floor(Math.random() * 3000) + 1000
    }
  }

  async saveAnalysis(request: {
    imageBase64: string
    description: string
    detectedText?: string
    currency?: string
    prompt?: string
  }): Promise<{ message: string; publicId: string; id: string }> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      message: 'Analysis saved successfully',
      publicId: `mock_${Date.now()}`,
      id: `mock_${Date.now()}`
    }
  }

  async login(email: string, password: string): Promise<{
    token: string
    user: { id: string; name: string; email: string }
  }> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      token: `mock_token_${Date.now()}`,
      user: {
        id: 'mock_user_1',
        name: 'Test User',
        email: email
      }
    }
  }

  async register(name: string, email: string, password: string): Promise<{
    token: string
    user: { id: string; name: string; email: string }
  }> {
    return this.login(email, password)
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  }

  getCurrentUser(): any {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
}

export const mockApiService = new MockApiService()
