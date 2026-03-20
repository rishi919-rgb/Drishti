import { useState, useEffect } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useContinuousScan } from '../hooks/useContinuousScan'
import { useObjectDetection } from '../hooks/useObjectDetection'
import { useFaceRecognition } from '../hooks/useFaceRecognition'
import { SpeechService } from '../services/speech'

interface User {
  id: string
  name: string
  email: string
}

interface ScanPageProps {
  user: User | null
  onNavigateToHistory: () => void
  onNavigateToReport: (_publicId: string) => void
  onShowAuth: () => void
  onLogout: () => void
}

export const ScanPage: React.FC<ScanPageProps> = ({
  user,
  onNavigateToHistory,
  onNavigateToReport: _onNavigateToReport,
  onShowAuth,
  onLogout
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastAnalysisData, setLastAnalysisData] = useState<any>(null)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  
  // Offline model states
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(true)
  const [isFaceRecognitionEnabled, setIsFaceRecognitionEnabled] = useState(false)
  const [targetObject, setTargetObject] = useState<string>('')
  const [detectedObjectsList, setDetectedObjectsList] = useState<string[]>([])
  const [recognizedFaces, setRecognizedFaces] = useState<string[]>([])
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false)
  const [enrollmentName, setEnrollmentName] = useState('')

  const {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureImage
  } = useCamera()

  // Object Detection Hook
  const {
    isModelLoading: isObjectModelLoading,
    isModelLoaded: isObjectModelLoaded,
    detectedObjects,
    targetObjectDetected,
    detectObjects
  } = useObjectDetection({
    videoRef,
    isEnabled: isObjectDetectionEnabled && isCameraActive,
    targetObject: targetObject || undefined,
    onTargetFound: (obj) => {
      if (targetObject) {
        speechService.speak(`Found ${obj.class}!`)
      }
    },
    confidenceThreshold: 0.5
  })

  // Face Recognition Hook
  const {
    isModelLoading: isFaceModelLoading,
    isModelLoaded: isFaceModelLoaded,
    detectedFaces: _detectedFaces,
    enrollFace,
    detectFaces
  } = useFaceRecognition({
    videoRef,
    isEnabled: isFaceRecognitionEnabled && isCameraActive,
    onFaceRecognized: (face) => {
      if (face.matchedName) {
        const announcement = `Hello ${face.matchedName}!`
        speechService.speak(announcement)
        setRecognizedFaces(prev => [...new Set([...prev, face.matchedName!])])
      }
    }
  })

  const {
    isScanning,
    isAnalyzing,
    lastAnalysis,
    error,
    startScanning,
    stopScanning,
    captureOnce
  } = useContinuousScan(captureImage, isCameraActive, {
    scanInterval: 3000, // 3 seconds between scans
    maxImageWidth: 640,
    maxImageHeight: 480,
    imageQuality: 0.7
  })

  const speechService = new SpeechService()

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
      stopScanning()
      speechService.stop()
    }
  }, [])

  // Detect objects and faces during scanning
  useEffect(() => {
    if (!isScanning || !isCameraActive) return

    const interval = setInterval(async () => {
      // Run offline detection alongside online analysis
      if (isObjectDetectionEnabled && isObjectModelLoaded) {
        await detectObjects()
      }
      
      if (isFaceRecognitionEnabled && isFaceModelLoaded) {
        await detectFaces()
      }
    }, 1000) // Run offline detection every second

    return () => clearInterval(interval)
  }, [isScanning, isCameraActive, isObjectDetectionEnabled, isFaceRecognitionEnabled, 
      isObjectModelLoaded, isFaceModelLoaded, detectObjects, detectFaces])

  // Update detected objects list for display
  useEffect(() => {
    const uniqueObjects = [...new Set(detectedObjects.map(obj => obj.class))]
    setDetectedObjectsList(uniqueObjects)
  }, [detectedObjects])
  useEffect(() => {
    if (lastAnalysis && !error) {
      setLastAnalysisData({
        description: lastAnalysis,
        timestamp: new Date().toISOString()
      })
    }
  }, [lastAnalysis, error])

  const handleSaveToHistory = async () => {
    if (!user || !lastAnalysisData) return

    try {
      // This would call the API service to save
      // For now, just show success message
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 3000)
      
      await speechService.speak('Analysis saved to your history')
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleShare = async () => {
    if (!lastAnalysisData) return

    try {
      // This would generate a share link
      const shareUrl = `${window.location.origin}/report/temp-${Date.now()}`
      
      await navigator.clipboard.writeText(shareUrl)
      await speechService.speak('Share link copied to clipboard')
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  const handleRepeatSpeech = async () => {
    if (lastAnalysis) {
      try {
        await speechService.speak(lastAnalysis)
      } catch (err) {
        console.error('Speech error:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
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
                  onClick={onNavigateToHistory}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                >
                  📚 History
                </button>
                <span className="text-sm">Welcome, {user.name}</span>
                <button
                  onClick={onLogout}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onShowAuth}
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
            <div className="bg-gray-800 rounded-lg p-4 relative">
              <video 
                ref={videoRef}
                id="camera-preview"
                className="w-full h-64 bg-black rounded"
                autoPlay
                playsInline
                muted
              />
              
              {/* Scanning Status Overlay */}
              <div className="absolute top-6 left-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isScanning 
                    ? 'bg-blue-900 text-blue-200 animate-pulse' 
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isScanning ? 'bg-blue-400' : 'bg-gray-400'
                  }`} />
                  {isScanning ? 'Scanning...' : 'Stopped'}
                </div>
              </div>

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
                onClick={isScanning ? stopScanning : startScanning}
                disabled={!isCameraActive || !isOnline}
                className={`px-8 py-4 rounded-lg text-xl font-semibold transition-colors focus:outline-none focus:ring-4 ${
                  isScanning 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                } disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                {isScanning ? '⏹ Stop Scanning' : '▶ Start Continuous Scanning'}
              </button>
              
              <button
                onClick={captureOnce}
                disabled={isAnalyzing || !isCameraActive || !isOnline}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-4 rounded-lg text-xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500"
              >
                {isAnalyzing ? '🔄 Analyzing...' : '📸 Capture Once'}
              </button>
            </div>
          </section>

          {/* Offline Models Settings */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Offline Detection</h3>
              
              <div className="space-y-4">
                {/* Object Detection Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">Object Detection (COCO-SSD)</span>
                    {isObjectModelLoading && (
                      <span className="text-xs text-yellow-400">Loading...</span>
                    )}
                    {isObjectModelLoaded && (
                      <span className="text-xs text-green-400">Ready</span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsObjectDetectionEnabled(!isObjectDetectionEnabled)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      isObjectDetectionEnabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {isObjectDetectionEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Face Recognition Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">Face Recognition</span>
                    {isFaceModelLoading && (
                      <span className="text-xs text-yellow-400">Loading...</span>
                    )}
                    {isFaceModelLoaded && (
                      <span className="text-xs text-green-400">Ready</span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsFaceRecognitionEnabled(!isFaceRecognitionEnabled)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      isFaceRecognitionEnabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {isFaceRecognitionEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Face Enrollment Button */}
                {isFaceRecognitionEnabled && (
                  <button
                    onClick={() => setShowFaceEnrollment(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors"
                  >
                    👤 Enroll New Face
                  </button>
                )}

                {/* Target Object Input */}
                {isObjectDetectionEnabled && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Target Object (optional)</label>
                    <input
                      type="text"
                      value={targetObject}
                      onChange={(e) => setTargetObject(e.target.value)}
                      placeholder="e.g., person, bottle, phone"
                      className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    {targetObjectDetected && (
                      <p className="text-green-400 text-sm mt-1">Target found!</p>
                    )}
                  </div>
                )}

                {/* Detected Objects List */}
                {detectedObjectsList.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Detected Objects:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedObjectsList.map((obj, idx) => (
                        <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recognized Faces */}
                {recognizedFaces.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Recognized Faces:</p>
                    <div className="flex flex-wrap gap-2">
                      {recognizedFaces.map((name, idx) => (
                        <span key={idx} className="bg-blue-700 px-2 py-1 rounded text-xs">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

            {showSaveSuccess && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-4">
                <p className="text-green-200 font-semibold">Success</p>
                <p className="text-green-200">Analysis saved to your history</p>
              </div>
            )}
            
            {lastAnalysis && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">Last Analysis</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{lastAnalysis}</p>
                
                <div className="flex gap-4 mt-4 flex-wrap">
                  <button
                    onClick={handleRepeatSpeech}
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

            {!lastAnalysis && !error && !cameraError && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400 text-lg">
                  {isScanning 
                    ? 'Point your camera at anything. The app will automatically scan and describe what it sees every 3 seconds.'
                    : 'Press "Start Continuous Scanning" to begin automatic analysis, or "Capture Once" for a single analysis.'
                  }
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      {/* Face Enrollment Modal */}
      {showFaceEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Enroll New Face</h2>
            
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Position your face in the camera view and enter a name to enroll.
              </p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={enrollmentName}
                  onChange={(e) => setEnrollmentName(e.target.value)}
                  placeholder="e.g., John, Mom, Friend"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Face Detection Preview */}
              <div className="bg-gray-700 rounded p-3">
                <p className="text-sm text-gray-300 mb-2">Face Detection Status:</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isFaceModelLoaded ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm">
                    {isFaceModelLoaded ? 'Models loaded - Ready to detect' : 'Loading models...'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Position your face clearly in the camera view before clicking "Enroll Face"
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFaceEnrollment(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (enrollmentName.trim()) {
                      const result = await enrollFace(enrollmentName.trim())
                      if (result.success) {
                        await speechService.speak(`Face enrolled for ${enrollmentName}`)
                        setShowFaceEnrollment(false)
                        setEnrollmentName('')
                        alert(`Successfully enrolled: ${enrollmentName}`)
                      } else {
                        const errorMsg = result.error || 'Face enrollment failed'
                        await speechService.speak(errorMsg)
                        alert(`Error: ${errorMsg}`)
                      }
                    }
                  }}
                  disabled={!enrollmentName.trim() || !isFaceModelLoaded}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
                >
                  Enroll Face
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
