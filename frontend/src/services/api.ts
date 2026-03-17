interface DrishtiAnalysisRequest {
  imageBase64: string
  prompt?: string
}

interface DrishtiAnalysisResponse {
  description: string
  detectedText?: string
  currency?: string
  analysisTime?: number
  error?: string
}

interface DrishtiSaveRequest {
  imageBase64: string
  description: string
  detectedText?: string
  currency?: string
  prompt?: string
}

interface DrishtiSaveResponse {
  message: string
  publicId: string
  id: string
}

interface DrishtiHistoryItem {
  _id: string
  description: string
  detectedText: string
  currency: string
  createdAt: string
  publicId: string
}

interface DrishtiHistoryResponse {
  analyses: DrishtiHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface DrishtiReportResponse {
  description: string
  detectedText: string
  currency: string
  createdAt: string
  publicId: string
}

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/drishti${endpoint}`
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // Analyze image (no auth required)
  async analyzeImage(request: DrishtiAnalysisRequest): Promise<DrishtiAnalysisResponse> {
    return this.request<DrishtiAnalysisResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Save analysis to history (auth required)
  async saveAnalysis(request: DrishtiSaveRequest): Promise<DrishtiSaveResponse> {
    return this.request<DrishtiSaveResponse>('/save', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Get user's analysis history (auth required)
  async getHistory(page: number = 1, limit: number = 10): Promise<DrishtiHistoryResponse> {
    return this.request<DrishtiHistoryResponse>(`/history?page=${page}&limit=${limit}`)
  }

  // Get public report (no auth required)
  async getReport(publicId: string): Promise<DrishtiReportResponse> {
    return this.request<DrishtiReportResponse>(`/report/${publicId}`)
  }

  // Get full analysis details (auth required)
  async getAnalysis(id: string): Promise<any> {
    return this.request(`/analysis/${id}`)
  }

  // Delete analysis (auth required)
  async deleteAnalysis(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/analysis/${id}`, {
      method: 'DELETE',
    })
  }

  // Auth methods (reuse from TruthStorm)
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  }

  // Get current user info
  getCurrentUser(): any {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
}

export const apiService = new ApiService()
export type {
  DrishtiAnalysisRequest,
  DrishtiAnalysisResponse,
  DrishtiSaveRequest,
  DrishtiSaveResponse,
  DrishtiHistoryItem,
  DrishtiHistoryResponse,
  DrishtiReportResponse
}
