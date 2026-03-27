import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  History as HistoryIcon, 
  LogOut, 
  User as UserIcon, 
  Mic, 
  MicOff, 
  Eye, 
  EyeOff, 
  Search, 
  Scan as ScanIcon,
  CheckCircle2,
  Zap,
  Navigation,
  Sparkles,
  Info,
  Volume2,
  FileText,
  UserPlus
} from 'lucide-react'
import Fuse from 'fuse.js'
import { useCamera }           from '../hooks/useCamera'
import { useContinuousScan }   from '../hooks/useContinuousScan'
import { useObjectDetection }  from '../hooks/useObjectDetection'
import { useVoiceCommands }    from '../hooks/useVoiceCommands'
import { useHaptic }           from '../hooks/useHaptic'
import { speechService }       from '../services/speech'
import { faceRecognitionService } from '../services/faceRecognition'
import { apiService }          from '../services/api'
import { announce }            from '../utils/announce'

interface User {
  id: string
  name: string
  email: string
}

interface ScanPageProps {
  user: User | null
  onNavigateToHistory: () => void
  onNavigateToReport: (publicId: string) => void
  onShowAuth: () => void
  onLogout: () => void
}

export const ScanPage: React.FC<ScanPageProps> = ({
  user,
  onNavigateToHistory,
  onShowAuth,
  onLogout
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastAnalysisData, setLastAnalysisData] = useState<any>(null)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [isRagFetching, setIsRagFetching] = useState(false)

  // Offline model states
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(true)
  const [targetObject, setTargetObject] = useState<string>('')
  const [detectedObjectsList, setDetectedObjectsList] = useState<string[]>([])

  // Face Mode States
  const [isFaceMode, setIsFaceMode] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isFaceModelLoading, setIsFaceModelLoading] = useState(false)

  // Haptic + announce
  const { tap, confirm, modeChange, error: errorHaptic } = useHaptic()

  const {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureImage
  } = useCamera()

  const {
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
        announce(`Target found: ${obj.class}`, 'assertive')
        confirm()
      }
    },
    confidenceThreshold: 0.5
  })

  const {
    isScanning,
    isAnalyzing,
    lastAnalysis,
    error,
    currentMode,
    startScanning,
    stopScanning,
    captureOnce
  } = useContinuousScan(captureImage, isCameraActive, detectObjects, {
    scanInterval: 3000,
    maxImageWidth: 640,
    maxImageHeight: 480,
    imageQuality: 0.7
  })

  const [isPathMode, setIsPathMode] = useState(false)
  const [manualCommand, setManualCommand] = useState('')
  const [transcript, setTranscript] = useState('')
  const [activeTab, setActiveTab] = useState<'scan' | 'nav' | 'face'>('scan')
  const scanContainerRef = useRef<HTMLDivElement>(null)

  // ── RAG helpers ──────────────────────────────────────────────────
  const formatOfflineResponse = (key: string, data: any): string => {
    if (data.benefits && data.eligibility) {
      let text = `${data.title}: ${data.description}. `
      text += `Benefits: ${data.benefits}. `
      text += `Eligibility: ${data.eligibility}. `
      if (data.documents)   text += `Documents required: ${data.documents}. `
      if (data.how_to_apply) text += `How to apply: ${data.how_to_apply}. `
      return text
    }
    if (data.remedy && data.precautions) {
      return `${data.condition}: ${data.description}. Recommended remedy: ${data.remedy}. Precautions: ${data.precautions}.`
    }
    return `${data.name || data.title || key}: ${data.description || JSON.stringify(data)}.`
  }

  const fetchRAG = async (topic: string): Promise<string> => {
    try {
      if (navigator.onLine) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
          const res = await fetch(`${baseUrl}/api/rag/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: topic })
          })
          const data = await res.json()
          return data.response
        } catch {
          // fall through to offline
        }
      }
    } catch { /* continue to offline fallback */ }

    try {
      const localData = await fetch('/data/knowledge.json').then(r => r.json())
      const offlineList = Object.entries(localData).map(([key, data]) => ({ name: key, ...(data as object) }))
      const offlineFuse = new Fuse(offlineList, { keys: ['name'], threshold: 0.4 })
      const offlineResult = offlineFuse.search(topic)
      if (offlineResult.length > 0) {
        const matched = offlineResult[0].item as any
        return formatOfflineResponse(matched.name, matched)
      }
    } catch { /* no local knowledge */ }

    return "I'm sorry, I don't have information about that right now."
  }

  const handleManualQuery = async (query: string) => {
    if (!query.trim()) return
    setTranscript(query)

    // ── Interrupt any current speech immediately ───────────────────
    // This ensures a long description never blocks a voice command.
    speechService.interrupt()

    announce(`Processing command: ${query}`)
    const cmd = query.toLowerCase().trim()

    // ── 1. STOP / HALT (highest priority) ────────────────────────────
    if (
      cmd.includes('stop') ||
      cmd.includes('halt') ||
      cmd.includes('pause')
    ) {
      tap()
      stopScanning()
      speechService.speakNow('Scanning stopped')
      announce('Scanning stopped')
      return
    }

    // ── 2. MODE SWITCHING ─────────────────────────────────────────────
    const isPathCommand =
      cmd.includes('path mode') ||
      cmd.includes('navigation mode') ||
      cmd.includes('nav mode') ||
      cmd.includes('switch to path') ||
      cmd.includes('go to path') ||
      cmd.includes('enable navigation') ||
      cmd.includes('pathfind') ||
      cmd.includes('navigate')

    const isFaceCmd =
      cmd.includes('face mode') ||
      cmd.includes('face recognition') ||
      cmd.includes('switch to face') ||
      cmd.includes('go to face') ||
      cmd.includes('identify person') ||
      cmd.includes('who is this') ||
      cmd.includes('recognize face') ||
      cmd.includes('neural mode')

    const isObjectCmd =
      cmd.includes('object mode') ||
      cmd.includes('vision mode') ||
      cmd.includes('general mode') ||
      cmd.includes('switch to object') ||
      cmd.includes('switch to general') ||
      cmd.includes('switch to vision') ||
      cmd.includes('scan mode')

    if (isPathCommand) {
      modeChange()
      setActiveTab('nav')
      setIsPathMode(true)
      setIsFaceMode(false)
      if (isScanning) stopScanning()
      speechService.speakNow('Navigation mode activated')
      announce('Navigation mode activated')
      return
    }

    if (isFaceCmd) {
      modeChange()
      setActiveTab('face')
      setIsFaceMode(true)
      setIsPathMode(false)
      if (isScanning) stopScanning()
      speechService.speakNow('Face recognition mode activated')
      announce('Face recognition mode activated')
      return
    }

    if (isObjectCmd) {
      modeChange()
      setActiveTab('scan')
      setIsFaceMode(false)
      setIsPathMode(false)
      if (isScanning) stopScanning()
      speechService.speakNow('General vision mode activated')
      announce('General vision mode activated')
      return
    }

    // ── 3. START CONTINUOUS SCANNING ─────────────────────────────────
    if (
      cmd.includes('start scanning') ||
      cmd.includes('start continuous') ||
      cmd.includes('begin scanning') ||
      cmd.includes('continuous scan') ||
      cmd.includes('keep scanning')
    ) {
      tap()
      const mode = isFaceMode ? 'face' : isPathMode ? 'path' : 'object'
      startScanning(mode)
      speechService.speakNow(`Continuous ${mode} scanning started`)
      announce(`Continuous ${mode} scanning started`)
      return
    }

    // ── 4. SINGLE SNAPSHOT ────────────────────────────────────────────
    if (
      cmd.includes('capture') ||
      cmd.includes('snapshot') ||
      cmd.includes('take photo') ||
      cmd.includes('what is this') ||
      cmd.includes("what's in front") ||
      cmd.includes('what do you see') ||
      cmd.includes('describe') ||
      cmd.includes('analyse') ||
      cmd.includes('analyze')
    ) {
      tap()
      speechService.speakNow('Capturing snapshot')
      announce('Capturing snapshot')
      captureOnce(isFaceMode ? 'face' : isPathMode ? 'path' : 'object')
      return
    }

    // ── 5. PAGE / APP ACTIONS ─────────────────────────────────────────
    if (
      cmd.includes('go to history') ||
      cmd.includes('open history') ||
      cmd.includes('show history') ||
      cmd.includes('my history')
    ) {
      tap()
      // Preserve mic continuous state so History page can restore it
      sessionStorage.setItem('drishti_mic_continuous', isContinuous ? '1' : '0')
      speechService.speakNow('Opening history')
      onNavigateToHistory()
      return
    }

    if (
      cmd.includes('log out') ||
      cmd.includes('logout') ||
      cmd.includes('sign out')
    ) {
      tap()
      speechService.speakNow('Logging out')
      onLogout()
      return
    }

    if (
      cmd.includes('enroll') ||
      cmd.includes('register face') ||
      cmd.includes('add person') ||
      cmd.includes('add face')
    ) {
      tap()
      handleFaceEnroll()
      return
    }

    if (
      cmd.includes('enable camera') ||
      cmd.includes('turn on camera') ||
      cmd.includes('start camera')
    ) {
      tap()
      startCamera()
      speechService.speakNow('Camera enabled')
      return
    }

    if (
      cmd.includes('disable camera') ||
      cmd.includes('turn off camera') ||
      cmd.includes('stop camera')
    ) {
      tap()
      stopCamera()
      speechService.speakNow('Camera disabled')
      return
    }

    if (cmd.includes('save') || cmd.includes('archive')) {
      tap()
      handleSaveToHistory()
      return
    }

    // ── 6. RAG KNOWLEDGE QUERY (last resort) ─────────────────────────
    setIsRagFetching(true)
    announce(`Looking up: ${query}`)
    try {
      const responseText = await fetchRAG(query)
      setLastAnalysisData({ description: responseText, timestamp: new Date().toISOString() })
      // speakNow so RAG answer always plays immediately even if something queued
      speechService.speakNow(responseText)
      announce(responseText)
    } catch {
      speechService.speakNow('Sorry, could not retrieve information.')
      announce('Information retrieval failed', 'assertive')
      errorHaptic()
    } finally {
      setIsRagFetching(false)
    }
  }



  const handleSaveToHistory = async () => {
    if (!lastAnalysisData) return
    tap()
    try {
      await apiService.saveAnalysis({
        imageBase64: '',
        description: lastAnalysisData.description,
        detectedText: lastAnalysisData.detectedText || '',
        currency: lastAnalysisData.currency || ''
      })
      confirm()
      setShowSaveSuccess(true)
      speechService.speak('Analysis saved to your history')
      announce('Analysis saved to history')
      setTimeout(() => setShowSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save analysis:', err)
      errorHaptic()
      speechService.speak('Could not save to history. Please check your connection.')
      announce('Save failed', 'assertive')
    }
  }

  const handleFaceEnroll = async () => {
    if (!isCameraActive || !videoRef.current) return
    setIsEnrolling(true)
    speechService.speak('Starting face enrollment. Please look directly at the camera.')
    announce('Face enrollment started. Look at the camera.')

    try {
      const label = prompt('Enter name for this person:')
      if (!label) { setIsEnrolling(false); return }
      await faceRecognitionService.enrollFace(label, videoRef.current)
      confirm()
      speechService.speak(`Successfully enrolled ${label}`)
      announce(`Face enrolled for ${label}`)
    } catch (err) {
      errorHaptic()
      console.error('Enrollment failed:', err)
      speechService.speak('Face enrollment failed. Please try again.')
      announce('Enrollment failed', 'assertive')
    } finally {
      setIsEnrolling(false)
    }
  }

  const {
    isListening,
    startListening,
    stopListening,
    toggleContinuousMode,
    isContinuous,
    isSupported,
    micError,
    muteFor
  } = useVoiceCommands({
    onCommand: (command) => {
      setTranscript(command)
      handleManualQuery(command)
    }
  })

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  announce('Network connected') }
    const handleOffline = () => { setIsOnline(false); announce('Network disconnected. Offline mode active.', 'assertive') }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (lastAnalysis) {
      setLastAnalysisData({ description: lastAnalysis, timestamp: new Date().toISOString() })
      // Mute mic for duration of this TTS to prevent echo feedback
      muteFor(lastAnalysis)
      speechService.speakNow(lastAnalysis)
      announce(lastAnalysis)
    }
  }, [lastAnalysis])

  useEffect(() => {
    if (error) {
      announce(`Scan error: ${error}`, 'assertive')
    }
  }, [error])

  useEffect(() => {
    if (detectedObjects && detectedObjects.length > 0) {
      const names = detectedObjects.map(obj => obj.class)
      setDetectedObjectsList(Array.from(new Set(names)))
    }
  }, [detectedObjects])

  useEffect(() => {
    startCamera()
    const initModels = async () => {
      setIsFaceModelLoading(true)
      try {
        await faceRecognitionService.loadModels()
        announce('Face recognition models loaded')
      } catch (err) {
        console.error('Model load failed:', err)
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

  // ── TAB helpers ──────────────────────────────────────────────────
  const switchToScan = () => {
    modeChange(); setActiveTab('scan'); setIsFaceMode(false); setIsPathMode(false)
    if (isScanning) stopScanning()
    announce('Switched to general vision mode')
    speechService.speak('Vision mode')
  }
  const switchToNav = () => {
    modeChange(); setActiveTab('nav'); setIsPathMode(true); setIsFaceMode(false)
    if (isScanning) stopScanning()
    announce('Switched to navigation mode')
    speechService.speak('Path navigation mode')
  }
  const switchToFace = () => {
    modeChange(); setActiveTab('face'); setIsFaceMode(true); setIsPathMode(false)
    if (isScanning) stopScanning()
    announce('Switched to face recognition mode')
    speechService.speak('Face recognition mode')
  }

  const toggleCameraWithFeedback = () => {
    tap()
    if (isCameraActive) {
      stopCamera()
      announce('Camera disabled')
    } else {
      startCamera()
      announce('Camera enabled')
    }
  }

  const toggleObjectDetection = () => {
    tap()
    const next = !isObjectDetectionEnabled
    setIsObjectDetectionEnabled(next)
    announce(next ? 'Object detection enabled' : 'Object detection disabled')
  }

  const toggleVoice = () => {
    tap()
    if (isListening) {
      stopListening()
      announce('Voice recognition stopped')
    } else {
      startListening()
      announce('Voice recognition started. Speak your command.')
    }
  }

  const handlePrimaryAction = () => {
    tap()
    if (isScanning) {
      stopScanning()
      announce('Scanning stopped')
      speechService.speak('Scanning stopped')
    } else {
      const mode = isFaceMode ? 'face' : isPathMode ? 'path' : 'object'
      startScanning(mode)
      announce(`Continuous scanning started in ${mode} mode`)
      speechService.speak(`${mode} mode started`)
    }
  }

  const handleCaptureOnce = () => {
    tap()
    captureOnce(isFaceMode ? 'face' : isPathMode ? 'path' : 'object')
    announce('Capturing snapshot')
    speechService.speak('Capturing')
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.header
        role="banner"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-50 p-4 md:p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20" aria-hidden="true">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">DRISHTI</h1>
            <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {isOnline ? 'Network Active' : 'Offline Mode'}
              </span>
            </div>
          </div>
        </div>

        <nav aria-label="User navigation" className="flex items-center gap-2 md:gap-4">
          <AnimatePresence>
            {user ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 md:gap-3"
              >
                <button
                  onClick={() => { tap(); onNavigateToHistory() }}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-2xl glass flex items-center justify-center hover:bg-white/10 transition-all group"
                  aria-label="Go to history"
                  title="Archive"
                >
                  <HistoryIcon className="w-5 h-5 text-slate-400 group-hover:text-accent transition-colors" aria-hidden="true" />
                </button>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl" aria-label={`Signed in as ${user.name}`}>
                  <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center text-accent" aria-hidden="true">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{user.name}</span>
                </div>
                <button
                  onClick={() => { tap(); onLogout() }}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-center hover:bg-rose-500/10 transition-all group"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5 text-rose-500/60 group-hover:text-rose-500 transition-colors" aria-hidden="true" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => { tap(); onShowAuth() }}
                className="px-6 py-2.5 bg-accent hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 transition-all"
                aria-label="Create account or sign in"
              >
                Initialize Linked Account
              </motion.button>
            )}
          </AnimatePresence>
        </nav>
      </motion.header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 relative z-10 flex flex-col md:flex-row p-4 md:p-6 gap-6 md:h-[calc(100vh-96px)]">
        
        {/* Left Sidebar */}
        <motion.aside
          aria-label="Controls panel"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar"
        >
          {/* Controls Card */}
          <div className="glass-morphism p-5 space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Interface Modulation</h2>
            
            <div className="space-y-4">
              <button
                onClick={toggleCameraWithFeedback}
                aria-label={isCameraActive ? 'Disable camera' : 'Enable camera'}
                aria-pressed={isCameraActive}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                  isCameraActive
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                {isCameraActive ? 'Disable Optical Feed' : 'Initialize Optical Feed'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={toggleVoice}
                  disabled={!isSupported || !!micError}
                  aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
                  aria-pressed={isListening}
                  className={`p-4 rounded-2xl transition-all border flex flex-col items-center gap-2 ${
                    isListening
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'glass border-white/5 text-slate-500 hover:text-slate-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isListening ? <Mic className="w-5 h-5" aria-hidden="true" /> : <MicOff className="w-5 h-5" aria-hidden="true" />}
                  <span className="text-[9px] font-black uppercase tracking-widest">{isListening ? 'Listening' : 'Voice'}</span>
                </button>

                <button
                  onClick={toggleObjectDetection}
                  aria-label={isObjectDetectionEnabled ? 'Disable object detection' : 'Enable object detection'}
                  aria-pressed={isObjectDetectionEnabled}
                  className={`p-4 rounded-2xl transition-all border flex flex-col items-center gap-2 ${
                    isObjectDetectionEnabled
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                    : 'glass border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {isObjectDetectionEnabled ? <Eye className="w-5 h-5" aria-hidden="true" /> : <EyeOff className="w-5 h-5" aria-hidden="true" />}
                  <span className="text-[9px] font-black uppercase tracking-widest">Object</span>
                </button>
              </div>

              {isSupported && (
                <button
                  onClick={() => { tap(); toggleContinuousMode() }}
                  aria-label={`Continuous voice mode: ${isContinuous ? 'on' : 'off'}`}
                  aria-pressed={isContinuous}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    isContinuous
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  Continuous Voice: {isContinuous ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          </div>

          {/* Neural Query / RAG Card */}
          <div className="glass-morphism p-5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Neural Query Registry</h2>
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="e.g. tell me about PM Kisan"
                value={manualCommand}
                aria-label="Type a command or ask about a topic"
                onChange={(e) => setManualCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualQuery(manualCommand)
                    setManualCommand('')
                  }
                }}
                className="w-full pl-11 pr-16 py-3.5 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-accent/40 transition-all"
              />

              {/* Send button / fetching indicator */}
              <button
                onClick={() => { handleManualQuery(manualCommand); setManualCommand('') }}
                disabled={!manualCommand.trim() || isRagFetching}
                aria-label={isRagFetching ? 'Fetching information…' : 'Send query'}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 px-3 bg-accent/20 hover:bg-accent/40 disabled:opacity-40 text-accent rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                {isRagFetching ? (
                  <span className="flex gap-1 items-center" aria-live="polite" aria-label="Loading…">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                ) : 'ASK'}
              </button>
            </div>

            {micError && (
              <p role="alert" className="mt-2 text-[9px] text-rose-400 font-bold leading-relaxed">
                {micError}
              </p>
            )}
          </div>

          {/* Pulse Monitor Card */}
          <div className="glass-morphism p-5 flex-1 min-h-[150px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20" aria-hidden="true">
              <Zap className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Pulse Monitor</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Scan</span>
                <div
                  role="status"
                  aria-label={isScanning ? 'Scan executing' : 'Scan standby'}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    isScanning ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isScanning ? 'Executing' : 'Standby'}
                </div>
              </div>

              <div className="space-y-2" role="status" aria-label={`Neural load: ${isAnalyzing ? '74%' : '0%'}`}>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Neural Load</span>
                  <span aria-hidden="true">{isAnalyzing ? '74%' : '0%'}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isAnalyzing ? '74%' : '0%' }}
                    className="h-full bg-accent"
                    aria-hidden="true"
                  />
                </div>

                {/* Typing dots while AI is processing */}
                {isAnalyzing && (
                  <div className="flex items-center gap-2 mt-1 text-accent" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">AI Processing</span>
                  </div>
                )}
              </div>

              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-accent/5 border border-accent/10 rounded-xl"
                  aria-live="polite"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full bg-accent ${isListening ? 'animate-ping' : ''}`} aria-hidden="true" />
                    Incoming Audio
                  </p>
                  <p className="text-xs font-bold text-slate-300 italic">"{transcript || 'Waiting for voice input…'}"</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Central Visualizer */}
        <section
          aria-label="Camera viewport and scan controls"
          className="flex-1 flex flex-col gap-6 relative"
          ref={scanContainerRef}
        >
          <div className="flex-1 relative glass-morphism rounded-[2.5rem] overflow-hidden group">
            <video
              ref={videoRef}
              id="camera-preview"
              autoPlay
              playsInline
              muted
              aria-label="Live camera feed"
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Overlay Layers */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-accent/40 rounded-tl-2xl" />
              <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-accent/40 rounded-tr-2xl" />
              <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-accent/40 rounded-bl-2xl" />
              <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-accent/40 rounded-br-2xl" />

              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/60 to-transparent shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10"
                  />
                )}
              </AnimatePresence>

              {detectedObjects?.map((obj, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute',
                    left: `${obj.bbox[0]}px`,
                    top: `${obj.bbox[1]}px`,
                    width: `${obj.bbox[2]}px`,
                    height: `${obj.bbox[3]}px`,
                  }}
                  className="border-2 border-indigo-500/60 bg-indigo-500/10 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <div className="absolute -top-6 left-0 bg-indigo-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                    {obj.class} ({(obj.score * 100).toFixed(0)}%)
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Camera off state */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md" role="status" aria-label="Camera is disabled">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6" aria-hidden="true">
                  <EyeOff className="w-10 h-10 text-slate-600" />
                </div>
                <h2 className="text-xl font-black tracking-tighter text-white mb-2 uppercase">Core Visualizer Offline</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] max-w-xs text-center leading-loose">
                  Optical input is required to begin environmental synthesis.
                </p>
                <button
                  onClick={() => { tap(); startCamera() }}
                  aria-label="Enable camera"
                  className="mt-8 px-10 py-4 bg-accent hover:bg-orange-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  Initialize Lens
                </button>
              </div>
            )}

            {/* Float Action Overlay */}
            {isCameraActive && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isAnalyzing}
                  onClick={handleCaptureOnce}
                  aria-label="Capture a single snapshot now"
                  className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-2xl shadow-accent/40 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  {isAnalyzing ? (
                    <span aria-hidden="true">
                      <span className="flex gap-0.5 items-center">
                        <span className="typing-dot bg-white" />
                        <span className="typing-dot bg-white" />
                        <span className="typing-dot bg-white" />
                      </span>
                    </span>
                  ) : (
                    <ScanIcon className="w-8 h-8 text-white relative z-10" aria-hidden="true" />
                  )}
                </motion.button>

                {/* Scan Mode Picker */}
                <div className="flex items-center gap-2 p-2 glass rounded-3xl border-white/5 shadow-2xl pointer-events-auto" role="group" aria-label="Scan mode selection">
                  <button
                    onClick={handlePrimaryAction}
                    aria-label={isScanning ? `Stop ${currentMode} scanning` : 'Start object scan'}
                    aria-pressed={isScanning && currentMode === 'object'}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${
                      currentMode === 'object' && isScanning ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-500'
                    }`}
                  >
                    <Zap className="w-4 h-4" aria-hidden="true" />
                    {isScanning && currentMode === 'object' ? 'Stop' : 'Pulse'}
                  </button>
                  <button
                    onClick={() => { tap(); isScanning && currentMode === 'path' ? stopScanning() : startScanning('path'); announce('Path navigation scanning') }}
                    aria-label={isScanning && currentMode === 'path' ? 'Stop navigation scan' : 'Start navigation scan'}
                    aria-pressed={isScanning && currentMode === 'path'}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${
                      currentMode === 'path' && isScanning ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-500'
                    }`}
                  >
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    NAV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Result Card */}
          <AnimatePresence>
            {lastAnalysisData && (
              <motion.div
                role="region"
                aria-label="Analysis result"
                aria-live="polite"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="glass-morphism p-6 border-accent/20 relative z-30"
              >
                <button
                  onClick={() => setLastAnalysisData(null)}
                  aria-label="Dismiss result"
                  className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white"
                >
                  ×
                </button>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Synthesis Result</span>
                    </div>
                    <p className="text-lg font-bold text-white leading-tight mb-4">
                      {lastAnalysisData.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {lastAnalysisData.detectedText && (
                        <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400">
                          OCR: {lastAnalysisData.detectedText.substring(0, 50)}…
                        </div>
                      )}
                      {lastAnalysisData.currency && (
                        <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/10 rounded-xl text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                          VAL: {lastAnalysisData.currency}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-3 w-full md:w-auto">
                    <button
                      onClick={() => { tap(); speechService.speak(lastAnalysisData.description) }}
                      aria-label="Repeat the analysis result aloud"
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                      Re-Vocalize
                    </button>
                    {user && (
                      <button
                        onClick={handleSaveToHistory}
                        aria-label="Save this analysis to your history"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20"
                      >
                        <HistoryIcon className="w-4 h-4" aria-hidden="true" />
                        Archive Data
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Sidebar */}
        <motion.aside
          aria-label="Recognition mode panel"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto pl-2 custom-scrollbar"
        >
          {/* Mode Tab Selector */}
          <div className="glass-morphism p-3 flex gap-2" role="tablist" aria-label="Recognition mode">
            <button
              role="tab"
              aria-selected={activeTab === 'scan'}
              onClick={switchToScan}
              className={`flex-1 py-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
                activeTab === 'scan' ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ScanIcon className="w-4 h-4" aria-hidden="true" />
              <span className="text-[8px] font-black uppercase tracking-widest">General</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'nav'}
              onClick={switchToNav}
              className={`flex-1 py-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
                activeTab === 'nav' ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Navigation className="w-4 h-4" aria-hidden="true" />
              <span className="text-[8px] font-black uppercase tracking-widest">Nav</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'face'}
              onClick={switchToFace}
              className={`flex-1 py-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
                activeTab === 'face' ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserIcon className="w-4 h-4" aria-hidden="true" />
              <span className="text-[8px] font-black uppercase tracking-widest">Neural</span>
            </button>
          </div>

          {/* Tab Panels */}
          <div className="flex-1 space-y-4">
            {activeTab === 'scan' && (
              <motion.div
                role="tabpanel"
                aria-label="General vision panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="glass-morphism p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    Optical Registry
                  </h3>
                  <div className="flex flex-wrap gap-2" aria-live="polite" aria-label="Detected objects">
                    {detectedObjectsList.length > 0 ? (
                      detectedObjectsList.map((name, i) => (
                        <span key={i} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                          {name}
                        </span>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-600 font-bold italic py-4">Waiting for visual confirmation…</p>
                    )}
                  </div>
                </div>

                <div className="glass-morphism p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Search For Object</h3>
                  <input
                    type="text"
                    placeholder="Define target (e.g. bottle)"
                    value={targetObject}
                    aria-label="Target object to find"
                    onChange={(e) => setTargetObject(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black text-white focus:outline-none focus:border-accent/40"
                  />
                  {targetObjectDetected && (
                    <div role="alert" className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Target Confirmed</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePrimaryAction}
                  aria-label={isScanning && currentMode === 'object' ? 'Stop object scanning' : 'Start object focus scan'}
                  aria-pressed={isScanning && currentMode === 'object'}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    isScanning && currentMode === 'object'
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                    : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isScanning && currentMode === 'object' ? 'Stop Focus' : 'Start Focus Scan'}
                </button>
              </motion.div>
            )}

            {activeTab === 'nav' && (
              <motion.div
                role="tabpanel"
                aria-label="Navigation panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-morphism p-5 space-y-4"
              >
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4">Tactile Navigation</h3>
                <button
                  onClick={() => {
                    tap()
                    const isPathActive = isScanning && currentMode === 'path'
                    if (isPathActive) { stopScanning(); announce('Navigation scan stopped') }
                    else { startScanning('path'); announce('Navigation scan started') }
                  }}
                  aria-label={isScanning && currentMode === 'path' ? 'Stop navigation scan' : 'Start pathfinding scan'}
                  aria-pressed={isScanning && currentMode === 'path'}
                  className={`w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    isScanning && currentMode === 'path' ? 'bg-accent text-white' : 'bg-white/5 text-slate-500 border border-white/5'
                  }`}
                >
                  <Navigation className="w-6 h-6" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                    {isScanning && currentMode === 'path' ? 'Navigation Active' : 'Start Pathfinding'}
                  </span>
                </button>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider text-center leading-relaxed">
                  AI will describe obstacles and safe paths in real-time.
                </p>
              </motion.div>
            )}

            {activeTab === 'face' && (
              <motion.div
                role="tabpanel"
                aria-label="Face recognition panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-morphism p-5 space-y-4"
              >
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Neural Recognition</h3>
                <button
                  onClick={() => {
                    tap()
                    const isFaceActive = isScanning && currentMode === 'face'
                    if (isFaceActive) { stopScanning(); announce('Face scan stopped') }
                    else { startScanning('face'); announce('Face recognition scanning started') }
                  }}
                  aria-label={isScanning && currentMode === 'face' ? 'Stop face recognition' : 'Start face recognition'}
                  aria-pressed={isScanning && currentMode === 'face'}
                  className={`w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
                    isScanning && currentMode === 'face' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  <Eye className="w-6 h-6" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                    {isScanning && currentMode === 'face' ? 'Neural ID Active' : 'Start ID Sync'}
                  </span>
                </button>

                <button
                  onClick={handleFaceEnroll}
                  disabled={isEnrolling || !isCameraActive}
                  aria-busy={isEnrolling}
                  aria-label={isEnrolling ? 'Enrolling face, please wait' : 'Enroll a new face identity'}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  {isEnrolling ? 'Registry Sync…' : 'Enroll New Identity'}
                </button>

                {isFaceModelLoading && (
                  <div role="status" aria-label="Loading face recognition models" className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <div className="w-2 h-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Loading Neural Shards…</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Save success toast */}
          <AnimatePresence>
            {showSaveSuccess && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3"
              >
                <CheckCircle2 className="text-white w-5 h-5" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-widest text-white leading-tight">
                  Neural Broadcast Archived Successfully
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      </main>

      {/* Bottom accent bar */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-accent/40 via-transparent to-indigo-500/40 z-50" aria-hidden="true" />
    </div>
  )
}
