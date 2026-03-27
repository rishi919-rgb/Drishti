import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Trash2, 
  Share2, 
  Volume2, 
  Clock, 
  User as UserIcon, 
  Search, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  X,
  Mic,
  MicOff
} from 'lucide-react'
import { apiService, DrishtiHistoryItem } from '../services/api'
import { speechService } from '../services/speech'
import { announce } from '../utils/announce'
import { useHaptic } from '../hooks/useHaptic'
import { useVoiceCommands } from '../hooks/useVoiceCommands'

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<DrishtiHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [user, setUser] = useState<any>(null)

  // ── Search/filter state ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  const navigate = useNavigate()
  const { tap, confirm: hapticConfirm, error: errorHaptic } = useHaptic()

  // ── Voice commands for history page ───────────────────────────
  const handleHistoryVoiceCommand = (cmd: string) => {
    const lower = cmd.toLowerCase().trim()
    if (
      lower.includes('close') ||
      lower.includes('go back') ||
      lower.includes('back') ||
      lower.includes('exit') ||
      lower.includes('return') ||
      lower.includes('stop') ||
      lower.includes('home') ||
      lower.includes('close history')
    ) {
      tap()
      speechService.speak('Closing history. Returning to scanner.')
      announce('Closing history')
      setTimeout(() => navigate('/'), 600)
    } else if (lower.includes('next page') || lower.includes('next')) {
      if (page < totalPages) { tap(); setPage(p => p + 1) }
    } else if (lower.includes('previous page') || lower.includes('previous') || lower.includes('prev')) {
      if (page > 1) { tap(); setPage(p => p - 1) }
    }
  }

  const { isListening: isHistoryListening, startListening: startHistoryListening,
          stopListening: stopHistoryListening, isSupported: voiceSupported } =
    useVoiceCommands({ onCommand: handleHistoryVoiceCommand })

  const toggleHistoryVoice = () => {
    tap()
    if (isHistoryListening) {
      stopHistoryListening()
      announce('Voice off')
    } else {
      startHistoryListening()
      announce('Listening. Say close history to go back.')
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        navigate('/')
        return
      }
    } else {
      navigate('/')
      return
    }
    loadHistory()
  }, [page])

  // Restore mic state from Scan page + speak greeting on first mount
  useEffect(() => {
    const greeting = 'Neural archive open. Say close history to go back, or next page, previous page.'
    speechService.speak(greeting)
    announce(greeting)

    const wasActive = sessionStorage.getItem('drishti_mic_continuous') === '1'
    if (wasActive && voiceSupported) {
      // Wait for greeting to finish before opening mic (avoid echo)
      const delay = Math.max(2000, greeting.length * 80)
      window.setTimeout(() => {
        startHistoryListening()
        announce('Voice commands active')
      }, delay)
      // Clear flag so refreshing the page doesn't re-trigger
      sessionStorage.removeItem('drishti_mic_continuous')
    }
  }, []) // run once only

  // Stop mic on unmount / page exit
  useEffect(() => {
    return () => { stopHistoryListening() }
  }, [])



  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getHistory(page, 10)
      setAnalyses(response.analyses)
      setTotalPages(response.pagination.pages)
      announce(`Page ${response.pagination.page} of ${response.pagination.pages} loaded. ${response.analyses.length} analyses found.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neural archive connection failed'
      setError(errorMessage)
      errorHaptic()
      announce(`Error loading history: ${errorMessage}`, 'assertive')
    } finally {
      setLoading(false)
    }
  }

  // ── Client-side filtered list ──────────────────────────────────
  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return analyses
    const q = searchQuery.toLowerCase()
    return analyses.filter(
      item =>
        item.description.toLowerCase().includes(q) ||
        (item.detectedText && item.detectedText.toLowerCase().includes(q)) ||
        (item.currency && item.currency.toLowerCase().includes(q))
    )
  }, [analyses, searchQuery])

  const handleSpeak = async (text: string) => {
    tap()
    announce(`Speaking: ${text.substring(0, 60)}…`)
    try {
      await speechService.speak(text)
    } catch (err) {
      console.error('Neural speech error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to purge this record from history?')) return
    tap()
    try {
      await apiService.deleteAnalysis(id)
      setAnalyses(analyses.filter(item => item._id !== id))
      hapticConfirm()
      await speechService.speak('Record purged')
      announce('Analysis deleted')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purge record'
      setError(errorMessage)
      errorHaptic()
      announce(`Delete failed: ${errorMessage}`, 'assertive')
    }
  }

  const handleShare = async (publicId: string) => {
    tap()
    const shareUrl = `${window.location.origin}/report/${publicId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      await speechService.speak('Broadcast link copied to clipboard. Ready to share.')
      announce('Share link copied to clipboard')
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handlePageChange = (newPage: number) => {
    tap()
    setPage(newPage)
    announce(`Navigating to page ${newPage}`)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show:  { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <div className="min-h-screen bg-dark text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* ── Page Header ───────────────────────────────────────── */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <Link
              to="/"
              aria-label="Go back to scanner"
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shadow-xl group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Neural Archive</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80">
                Synchronized History
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Voice toggle */}
            {voiceSupported && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleHistoryVoice}
                aria-label={isHistoryListening ? 'Stop voice commands' : 'Enable voice commands — say "close history" to go back'}
                aria-pressed={isHistoryListening}
                title={isHistoryListening ? 'Voice active' : 'Enable voice'}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                  isHistoryListening
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                }`}
              >
                {isHistoryListening
                  ? <Mic className="w-5 h-5" aria-hidden="true" />
                  : <MicOff className="w-5 h-5" aria-hidden="true" />}
              </motion.button>
            )}

            <div className="flex items-center gap-3 glass p-3 rounded-2xl border-white/5" aria-label={`Logged in as ${user?.name}`}>
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                <UserIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-slate-400">{user?.name}</span>
            </div>
          </div>

        </motion.header>

        {/* ── Search Box ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter analyses by description, text, or currency…"
              aria-label="Search your history"
              className="w-full pl-11 pr-10 py-4 glass rounded-2xl border-white/5 focus:border-accent/30 focus:outline-none text-sm font-bold text-white placeholder:text-slate-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest" aria-live="polite">
              {filteredAnalyses.length} result{filteredAnalyses.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}
        </motion.div>

        {/* ── Main Content ──────────────────────────────────────── */}
        <main>
          {error && (
            <motion.div 
              role="alert"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-4 mb-8 border-rose-500/20 flex items-center gap-3 text-rose-400 font-bold text-xs uppercase tracking-widest"
            >
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              {error}
            </motion.div>
          )}

          {loading ? (
            <div
              role="status"
              aria-label="Loading your history"
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Accessing Archive...</p>
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 glass rounded-[2.5rem] border-dashed border-white/10"
            >
              <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">
                {searchQuery ? 'No matching analyses found.' : 'No synchronization pulses detected.'}
              </p>
              {!searchQuery && (
                <Link
                  to="/"
                  className="text-accent text-xs font-black uppercase tracking-widest mt-4 inline-block hover:underline"
                >
                  Begin Field Scanning
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div 
              role="list"
              aria-label="Analysis history"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredAnalyses.map((item) => (
                  <motion.article 
                    layout
                    role="listitem"
                    key={item._id} 
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-morphism p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-accent/30"
                    aria-label={`Analysis from ${new Date(item.createdAt).toLocaleDateString()}: ${item.description.substring(0, 60)}`}
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                          <Calendar className="w-3 h-3 text-accent" aria-hidden="true" />
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </time>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                          <Clock className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </span>
                      </div>
                      
                      <h2 className="text-lg font-bold text-white group-hover:text-accent transition-colors leading-snug">
                        {item.description}
                      </h2>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.detectedText && (
                          <div className="text-[10px] font-bold text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                            OCR: {item.detectedText.substring(0, 30)}…
                          </div>
                        )}
                        {item.currency && (
                          <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                            VAL: {item.currency}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSpeak(item.description)}
                        className="flex-1 md:flex-none w-12 h-12 rounded-xl bg-accent/90 hover:bg-orange-500 flex items-center justify-center shadow-lg shadow-accent/20 transition-all"
                        aria-label={`Read aloud: ${item.description.substring(0, 50)}`}
                        title="Vocalize"
                      >
                        <Volume2 className="text-white w-5 h-5" aria-hidden="true" />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShare(item.publicId)}
                        className="flex-1 md:flex-none w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all"
                        aria-label="Copy shareable link"
                        title="Copy Link"
                      >
                        <Share2 className="text-white w-5 h-5" aria-hidden="true" />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(item._id)}
                        className="flex-1 md:flex-none w-12 h-12 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition-all group/del"
                        aria-label="Delete this analysis"
                        title="Delete"
                      >
                        <Trash2 className="text-slate-400 group-hover/del:text-rose-400 w-5 h-5" aria-hidden="true" />
                      </motion.button>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
              
              {/* Pagination Interface */}
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex justify-center items-center gap-6 mt-12 bg-white/5 p-4 rounded-3xl border border-white/5 max-w-xs mx-auto">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                    className="p-2 rounded-xl bg-white/5 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                  </motion.button>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Node</span>
                    <span className="text-sm font-black text-white" aria-label={`Page ${page} of ${totalPages}`}>
                      {page} <span className="text-slate-600">/</span> {totalPages}
                    </span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    className="p-2 rounded-xl bg-white/5 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </motion.button>
                </nav>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
