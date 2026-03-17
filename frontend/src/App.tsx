import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from './hooks/useCamera'
import { GeminiService } from './services/gemini'
import { SpeechService } from './services/speech'
import { apiService } from './services/api'

interface User {
  id: string
  name: string
  email: string
}

function App() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [user, setUser] = useState<User | null>(null)
  const [lastAnalysisData, setLastAnalysisData] = useState<any>(null)
  const [showAuth, setShowAuth] = useState(false)
  
  const {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureImage
  } = useCamera()
  
  const geminiService = useRef(new GeminiService())
  const speechService = useRef(new SpeechService())

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Start camera when component mounts
  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
      speechService.current.stop()
    }
  }, [])

  const handleCaptureAndAnalyze = async () => {
    if (!isOnline) {
      setError('You are offline. Please check your internet connection.')
      return
    }

    if (!isCameraActive) {
      setError('Camera is not active. Please refresh the page.')
      return
    }

    setIsLoading(true)
    setError('')
    setAnalysis('')

    try {
      // Capture image from video stream
      const imageData = captureImage()
      if (!imageData) {
        throw new Error('Failed to capture image')
      }

      // Analyze with Gemini (now via backend)
      const result = await geminiService.current.analyzeImage(imageData)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Format the analysis text
      let analysisText = result.description
      if (result.textFound) {
        analysisText += ` Text found: ${result.textFound}`
      }
      if (result.currency) {
        analysisText += ` Currency: ${result.currency}`
      }

      setAnalysis(analysisText)
      
      // Store the full data for saving/sharing
      setLastAnalysisData({
        imageBase64: imageData,
        description: result.description,
        detectedText: result.textFound,
        currency: result.currency
      })

      // Speak the result
      try {
        await speechService.current.speak(analysisText)
      } catch (speechError) {
        console.error('Speech error:', speechError)
        // Continue even if speech fails
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      
      // Speak the error
      try {
        await speechService.current.speak(`Error: ${errorMessage}`)
      } catch (speechError) {
        console.error('Speech error:', speechError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveToHistory = async () => {
    if (!user || !lastAnalysisData) return

    try {
      await apiService.saveAnalysis(lastAnalysisData)
      
      // Show success message
      setError('')
      
      // Speak success
      try {
        await speechService.current.speak('Analysis saved to your history')
      } catch (speechError) {
        console.error('Speech error:', speechError)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save analysis'
      setError(errorMessage)
    }
  }

  const handleShare = async () => {
    if (!lastAnalysisData) return

    try {
      // First save to get a public ID
      const result = user 
        ? await apiService.saveAnalysis(lastAnalysisData)
        : { publicId: 'temp-' + Date.now() } // Temporary ID for anonymous users

      const shareUrl = `${window.location.origin}/report/${result.publicId}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      
      // Speak success
      try {
        await speechService.current.speak('Share link copied to clipboard')
      } catch (speechError) {
        console.error('Speech error:', speechError)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share link'
      setError(errorMessage)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password) as any
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      setShowAuth(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Drishti</h1>
            <p className="text-gray-400">AI Visual Assistant</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Online Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isOnline ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-400' : 'bg-red-400'
              }`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* User Authentication */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/history')}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                >
                  📚 History
                </button>
                <span className="text-sm">Welcome, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* Camera Preview Section */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <video 
                ref={videoRef}
                id="camera-preview"
                className="w-full h-64 bg-black rounded"
                autoPlay
                playsInline
                muted
              />
              
              {!isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
                  <p className="text-gray-400">Starting camera...</p>
                </div>
              )}
            </div>
          </section>

          {/* Controls Section */}
          <section className="mb-8">
            <div className="flex justify-center gap-4">
              <button
                onClick={handleCaptureAndAnalyze}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-8 py-4 rounded-lg text-xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500"
                disabled={isLoading || !isCameraActive || !isOnline}
              >
                {isLoading ? 'Analyzing...' : 'Capture & Analyze'}
              </button>
            </div>
          </section>

          {/* Results Section */}
          <section className="mb-8">
            {cameraError && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
                <p className="text-red-200 font-semibold">Camera Error</p>
                <p className="text-red-200">{cameraError}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
                <p className="text-red-200 font-semibold">Error</p>
                <p className="text-red-200">{error}</p>
              </div>
            )}
            
            {analysis && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">Analysis Result</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{analysis}</p>
                
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => speechService.current.speak(analysis)}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-green-500"
                  >
                    🔄 Repeat Speech
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-purple-500"
                  >
                    🔗 Share
                  </button>
                  
                  {user && (
                    <button
                      onClick={handleSaveToHistory}
                      className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-orange-500"
                    >
                      💾 Save to History
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Authentication Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Login to Drishti</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuth(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value
                    const password = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value
                    if (email && password) {
                      handleLogin(email, password)
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
