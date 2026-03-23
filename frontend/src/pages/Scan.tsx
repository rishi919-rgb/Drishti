import { useState, useEffect, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useContinuousScan } from '../hooks/useContinuousScan'
import { useObjectDetection } from '../hooks/useObjectDetection'
import { useVoiceCommands } from '../hooks/useVoiceCommands'
import { speechService } from '../services/speech'
import { faceRecognitionService } from '../services/faceRecognition'

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
  const [targetObject, setTargetObject] = useState<string>('')
  const [detectedObjectsList, setDetectedObjectsList] = useState<string[]>([])
  
  // Face Mode States
  const [isFaceMode, setIsFaceMode] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isFaceModelLoading, setIsFaceModelLoading] = useState(false)

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

  const {
    isScanning,
    isAnalyzing,
    lastAnalysis,
    error,
    startScanning,
    stopScanning,
    captureOnce,
    currentMode
  } = useContinuousScan(captureImage, isCameraActive, detectObjects, {
    scanInterval: 3000, // 3 seconds between scans
    maxImageWidth: 640,
    maxImageHeight: 480,
    imageQuality: 0.7
  })

  // Mode states (consolidation)
  const [isPathMode, setIsPathMode] = useState(false)
  const [manualCommand, setManualCommand] = useState('')

  // Command Parsing
  const handleVoiceCommand = useCallback((command: string) => {
    const speech = command.toLowerCase();
    console.log("Voice Command Recognized:", speech);

    if (speech.includes('start scanning')) {
      speechService.speak('Starting continuous scan');
      startScanning(isFaceMode ? 'face' : isPathMode ? 'path' : 'object');
    } else if (speech.includes('stop scanning')) {
      speechService.speak('Stopping scan');
      stopScanning();
    } else if (speech.includes('capture once') || speech.includes("what's in front of me") || speech.includes("what is in front of me")) {
      speechService.speak('Taking snapshot');
      captureOnce(isFaceMode ? 'face' : isPathMode ? 'path' : 'object');
    } else if (speech.includes('object mode') || speech.includes('vision mode')) {
      setIsFaceMode(false);
      setIsPathMode(false);
      speechService.speak('Switching to vision mode');
      if (isScanning) stopScanning();
    } else if (speech.includes('path mode')) {
      setIsPathMode(true);
      setIsFaceMode(false);
      speechService.speak('Switching to path mode');
      if (isScanning) stopScanning();
    } else if (speech.includes('face mode')) {
      setIsFaceMode(true);
      setIsPathMode(false);
      speechService.speak('Switching to face mode');
      if (isScanning) stopScanning();
    }
  }, [isFaceMode, isPathMode, isScanning, startScanning, stopScanning, captureOnce]);

  const { isListening, isStarting, isContinuous, isSupported: isVoiceSupported, micError, startListening, stopListening, resetError, toggleContinuousMode } = useVoiceCommands({
    onCommand: handleVoiceCommand
  });

  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCommand.trim()) {
      handleVoiceCommand(manualCommand.trim());
      setManualCommand('');
    }
  };

  const handleEnrollFace = async () => {
    if (!isCameraActive) return
    
    const name = window.prompt("Enter name for enrollment:");
    if (!name) return

    setIsEnrolling(true)
    try {
      await speechService.speak(`Enrolling ${name}. Please look at the camera.`);
      const videoElement = videoRef.current;
      if (videoElement) {
        await faceRecognitionService.enrollFace(name, videoElement);
        speechService.speak(`Successfully enrolled ${name}`);
      }
    } catch (err: any) {
      speechService.speak(`Enrollment failed: ${err.message}`);
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleClearFaces = async () => {
    if (window.confirm("Are you sure you want to delete all enrolled faces? This cannot be undone.")) {
      const { faceStorageService } = await import('../services/faceStorage');
      await faceStorageService.clearAllFaces();
      await faceRecognitionService.refreshLabeledDescriptors();
      speechService.speak("All enrolled faces have been deleted.");
    }
  }


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
    
    const initModels = async () => {
      setIsFaceModelLoading(true)
      try {
        await faceRecognitionService.loadModels()
      } catch (err) {
        console.error("Model load failed:", err)
      } finally {
        setIsFaceModelLoading(false)
      }
    }
    
    initModels()
    
    return () => {
      stopCamera()
      stopScanning()
      speechService.stop()
    }
  }, [])

  // Cleaned up the old independent offline detection effect
  // Now detection is driven purely by the useContinuousScan interval

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
    if (lastAnalysisData && lastAnalysisData.description) {
      try {
        await speechService.speak(lastAnalysisData.description)
      } catch (err) {
        console.error('Speech error:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl font-bold text-white">D</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                DRISHTI
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-400/80">AI Visual Empowerment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Status Indicators */}
            <div className="hidden md:flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isOnline 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              } text-xs font-bold transition-all`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isOnline ? 'NETWORK CONNECTED' : 'OFFLINE MODE'}
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={onNavigateToHistory}
                    className="hidden sm:flex h-10 items-center gap-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all"
                  >
                    <span>📚</span> History
                  </button>
                  <div className="h-10 w-[1px] bg-white/10 mx-1 hidden sm:block" />
                  <div className="flex flex-col items-end mr-1 hidden sm:flex">
                    <span className="text-xs font-bold text-slate-200">{user.name}</span>
                    <button onClick={onLogout} className="text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase tracking-wider transition-colors">Sign Out</button>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/20 flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <button
                  onClick={onShowAuth}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-rose-600/90 backdrop-blur-md text-white px-6 py-2.5 flex items-center justify-center gap-3 text-sm font-bold tracking-wide animate-in slide-in-from-top duration-500">
          <span className="bg-white/20 p-1 rounded-md text-base">⚠️</span>
          Network unavailable. Using local edge models for basic object detection.
        </div>
      )}
      
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          
          {/* Left Column: Visuals & Modes */}
          <div className="lg:col-span-7 space-y-6">
            {/* Camera Viewport */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              <div className="relative aspect-video bg-slate-900 rounded-[1.8rem] overflow-hidden border border-white/10 shadow-3xl">
                <video 
                  ref={videoRef}
                  id="camera-preview"
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Visual Overlays */}
                <div className="absolute inset-x-0 top-0 p-6 flex justify-between items-start pointer-events-none">
                  <div className={`px-4 py-2 rounded-2xl backdrop-blur-md border ${
                    isScanning 
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-100' 
                      : 'bg-slate-900/60 border-white/5 text-slate-400'
                  } flex items-center gap-3 transition-all duration-500`}>
                    <div className="relative h-2 w-2">
                      <div className={`absolute inset-0 rounded-full ${isScanning ? 'bg-indigo-400 animate-ping' : 'bg-slate-500'}`} />
                      <div className={`absolute inset-0 rounded-full ${isScanning ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                    </div>
                    <span className="text-xs font-black tracking-widest uppercase">
                      {isScanning ? `${currentMode.toUpperCase()} STREAM ACTIVE` : 'IDLE'}
                    </span>
                  </div>

                  {isAnalyzing && (
                    <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                      Processing AI...
                    </div>
                  )}
                </div>

                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-t-indigo-500 border-white/5 rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Awaiting Camera Sync</p>
                  </div>
                )}
                
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/90 p-8 text-center">
                    <span className="text-4xl mb-4">🚫</span>
                    <h3 className="text-xl font-bold text-rose-200 mb-2">Capture Interface Failed</h3>
                    <p className="text-rose-300/80 text-sm max-w-xs">{cameraError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar (Glassy) */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  if (isScanning) stopScanning();
                  else startScanning(isFaceMode ? 'face' : isPathMode ? 'path' : 'object');
                }}
                disabled={!isCameraActive || !isOnline}
                className={`flex-1 h-20 rounded-3xl flex items-center justify-center gap-4 text-xl font-black transition-all ${
                  isScanning 
                    ? 'bg-rose-600/20 border-2 border-rose-500/50 text-rose-300 shadow-[0_0_40px_rgba(225,29,72,0.1)]' 
                    : 'bg-indigo-600 border-2 border-indigo-400/30 text-white shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isScanning ? (
                  <><span className="text-2xl">⏹</span> Terminate Scan</>
                ) : (
                  <><span className="text-2xl">⚡</span> Ignite {isFaceMode ? 'Face' : isPathMode ? 'Path' : 'Vision'} AI</>
                )}
              </button>

              {!isScanning && (
                <button
                  onClick={() => captureOnce(isFaceMode ? 'face' : isPathMode ? 'path' : 'object')}
                  disabled={isAnalyzing || !isCameraActive || !isOnline}
                  className="px-10 h-20 bg-white/5 border-2 border-white/10 rounded-3xl text-sm font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-30"
                >
                  {isAnalyzing ? '...' : '📸 Snapshot'}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Intelligence & Settings */}
          <div className="lg:col-span-5 space-y-6">
            {/* Mode Controls Card */}
            <div className="p-1 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-slate-800 to-purple-500/20 shadow-2xl">
              <div className="bg-[#11111a]/95 backdrop-blur-2xl rounded-[1.9rem] p-6">
                <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400 mb-6">Execution Mode</h3>
                <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => { setIsPathMode(false); setIsFaceMode(false); if (isScanning) stopScanning(); }}
                    className={`flex flex-col items-center py-4 rounded-xl gap-2 transition-all ${!isPathMode && !isFaceMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                  >
                    <span className="text-xl">👁️</span>
                    <span className="text-[10px] font-black uppercase">Vision</span>
                  </button>
                  <button
                    onClick={() => { setIsPathMode(true); setIsFaceMode(false); if (isScanning) stopScanning(); }}
                    className={`flex flex-col items-center py-4 rounded-xl gap-2 transition-all ${isPathMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                  >
                    <span className="text-xl">🚶</span>
                    <span className="text-[10px] font-black uppercase">Path</span>
                  </button>
                  <button
                    onClick={() => { setIsFaceMode(true); setIsPathMode(false); if (isScanning) stopScanning(); }}
                    className={`flex flex-col items-center py-4 rounded-xl gap-2 transition-all ${isFaceMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                  >
                    <span className="text-xl">👤</span>
                    <span className="text-[10px] font-black uppercase">Face</span>
                  </button>
                </div>

                {/* Face Enrollment (Contextual) */}
                {isFaceMode && !isScanning && (
                  <div className="mt-6 space-y-3 animate-in zoom-in-95 duration-300">
                    <button
                      onClick={handleEnrollFace}
                      disabled={isEnrolling || !isCameraActive || isFaceModelLoading}
                      className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-pink-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isEnrolling ? 'Initializing Biometrics...' : '➕ Enroll New Identity'}
                    </button>
                    <button
                      onClick={handleClearFaces}
                      className="w-full py-2.5 text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase tracking-widest transition-colors"
                    >
                      Delete All Local Biometrics
                    </button>
                  </div>
                )}

                {/* Voice & Manual Command Controls */}
                <div className="mt-4 space-y-3">
                  {isVoiceSupported ? (
                    <>
                      {micError && (
                        <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-sm">⚠️</span>
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-loose">
                              {micError}
                            </p>
                          </div>
                          <button
                            onClick={() => { resetError(); startListening(); }}
                            className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
                          >
                            Retry Connection
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => isListening || isStarting ? stopListening() : startListening(false)}
                        disabled={isListening || isStarting || !!micError}
                        className={`w-full py-4 flex items-center justify-center gap-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          !!micError 
                            ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-700'
                            : isListening || isStarting
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_30px_rgba(225,29,72,0.3)] animate-pulse'
                            : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] active:scale-95'
                        }`}
                      >
                        <span className="text-xl">🎙️</span>
                        {isStarting ? 'Waiting for Mic...' : isListening ? (isContinuous ? 'Listening Continuously...' : 'Listening...') : 'Single Command'}
                      </button>

                      {/* Continuous Voice Toggle */}
                      <button
                        onClick={toggleContinuousMode}
                        className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          isContinuous
                            ? 'bg-green-500/20 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                            : 'bg-black/30 border-white/5 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                         <span className={isContinuous ? "animate-pulse" : ""}>🔄</span>
                         {isContinuous ? "Continuous Voice: ON" : "Continuous Voice: OFF"}
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center gap-3">
                      <span className="text-lg opacity-50">🎙️</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Voice Commands Unsupported
                      </p>
                    </div>
                  )}

                  {/* Text Fallback */}
                  {(!isVoiceSupported || micError) && (
                    <form onSubmit={handleManualCommandSubmit} className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="text"
                        value={manualCommand}
                        onChange={(e) => setManualCommand(e.target.value)}
                        placeholder="TYPE COMMAND (E.G. START SCANNING)"
                        className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-indigo-500/50 focus:outline-none text-[10px] font-black uppercase tracking-widest text-slate-300 placeholder:text-slate-600 transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={!manualCommand.trim()}
                        className="px-4 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl font-black text-[10px] uppercase disabled:opacity-30 transition-all"
                      >
                        SEND
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className={`p-1 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-2xl transition-all duration-700 ${lastAnalysisData ? 'opacity-100 scale-100' : 'opacity-50 grayscale'}`}>
              <div className="bg-[#11111a]/95 backdrop-blur-2xl rounded-[1.9rem] p-8 flex flex-col h-full min-h-[320px]">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-400">Intelligence Nexus</h3>
                  {lastAnalysisData && (
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                      {new Date(lastAnalysisData.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  {lastAnalysisData ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                      <p className="text-xl sm:text-2xl font-bold leading-tight text-white mb-6">
                        {lastAnalysisData.description}
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                      <div className="w-12 h-12 border-2 border-dashed border-slate-600 rounded-full mb-4 animate-[spin_10s_linear_infinite]" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Awaiting Signal</p>
                    </div>
                  )}
                </div>

                {lastAnalysisData && (
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={handleRepeatSpeech}
                      className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <span className="text-lg">🔊</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Replay</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <span className="text-lg">🔗</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Transmit</span>
                    </button>
                    {user && (
                      <button
                        onClick={handleSaveToHistory}
                        className="col-span-2 py-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-indigo-400 transition-all active:scale-95"
                      >
                        <span className="text-lg">💾</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Commit to History</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Local Detection (Edge) Stats */}
            <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem] backdrop-blur-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500">Edge Detection Engine</h3>
                <button
                    onClick={() => setIsObjectDetectionEnabled(!isObjectDetectionEnabled)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase transition-all ${
                      isObjectDetectionEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-700/50 text-slate-400 border border-transparent'
                    }`}
                  >
                    {isObjectDetectionEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
              </div>

              {isObjectDetectionEnabled ? (
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={targetObject}
                      onChange={(e) => setTargetObject(e.target.value)}
                      placeholder="SET FOCUS OBJECT (E.G. BOTTLE)"
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 focus:border-indigo-500/50 focus:outline-none text-[10px] font-black uppercase tracking-widest text-slate-300 placeholder:text-slate-600 transition-all"
                    />
                  </div>

                  {targetObject && targetObjectDetected && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-bounce">
                      <span className="text-xl">🎯</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Target Visualized</span>
                    </div>
                  )}

                  {detectedObjectsList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {detectedObjectsList.map((obj, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase text-slate-400">
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-loose">
                  Local object detection is offline. Enable to process visual hierarchy on device.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Model Loading HUD */}
      {isFaceModelLoading && (
        <div className="fixed bottom-8 left-8 bg-black/80 backdrop-blur-2xl border border-indigo-500/30 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500 flex items-center gap-4 z-[100]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-indigo-400">Loading Neural Models</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Synchronizing Face-API Shards</p>
          </div>
        </div>
      )}
    </div>
  )
}
