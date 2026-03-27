import { mockApiService } from './mockApi'

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
  private useMock: boolean

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
    // Force real API - no more mock
    this.useMock = false
    console.log('API Service initialized - using real backend:', this.baseUrl)
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
    if (this.useMock) {
      console.log('Using mock API for analysis')
      return mockApiService.analyzeImage(request)
    }

    return this.request<DrishtiAnalysisResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  // Analyze path (no auth required)
  async analyzePath(request: DrishtiAnalysisRequest): Promise<{success: boolean, guidance: string, objects: any[]}> {
    return this.request<{success: boolean, guidance: string, objects: any[]}>('/path', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  // Save analysis to history (auth required)
  async saveAnalysis(request: DrishtiSaveRequest): Promise<DrishtiSaveResponse> {
    if (this.useMock) {
      return mockApiService.saveAnalysis(request)
    }
    
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

  // Auth methods — note: these call /api/auth/... NOT /api/drishti/...
  async login(email: string, password: string) {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Login failed: ${res.status}`);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Registration failed: ${res.status}`);
    return data;
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
