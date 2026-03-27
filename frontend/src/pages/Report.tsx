import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Share2, ArrowLeft, Clock, FileText, Globe, Search, CheckCircle } from 'lucide-react'
import { apiService } from '../services/api'
import { speechService } from '../services/speech'
import { announce } from '../utils/announce'
import { useHaptic } from '../hooks/useHaptic'

interface ReportData {
  description: string
  detectedText: string
  currency: string
  createdAt: string
  publicId: string
}

export default function ReportPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const { tap, confirm } = useHaptic()

  useEffect(() => {
    if (publicId) {
      loadReport()
    }
  }, [publicId])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiService.getReport(publicId!)
      setReport(data)
      announce(`Report loaded: ${data.description.substring(0, 80)}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis pulse not found'
      setError(errorMessage)
      announce(`Error: ${errorMessage}`, 'assertive')
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = async () => {
    if (!report || isSpeaking) return
    tap()

    let textToSpeak = report.description
    if (report.detectedText) textToSpeak += `. Recognized text: ${report.detectedText}`
    if (report.currency)     textToSpeak += `. Monetary value detected: ${report.currency}`

    try {
      setIsSpeaking(true)
      announce('Reading report aloud…')
      await speechService.speak(textToSpeak)
    } catch (err) {
      console.error('Neural speech error:', err)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleShare = async () => {
    if (!report) return
    tap()
    const shareUrl = window.location.href
    try {
      await navigator.clipboard.writeText(shareUrl)
      confirm()
      setIsCopied(true)
      await speechService.speak('Broadcast link copied to clipboard')
      announce('Share link copied to clipboard')
      setTimeout(() => setIsCopied(false), 3000)
    } catch (err) {
      console.error('Transmission error:', err)
    }
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading report"
        className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 text-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(249,115,22,0.1)]"
          aria-hidden="true"
        >
          <Search className="text-accent w-8 h-8" />
        </motion.div>
        <p className="text-slate-500 font-black text-xs uppercase tracking-[0.5em] animate-pulse">
          Synchronizing Neural Data…
        </p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <motion.div 
          role="alert"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism p-10 max-w-md text-center border-rose-500/20"
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6" aria-hidden="true">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Pulse Missing</h1>
          <p className="text-slate-500 mb-8 font-medium">{error || 'This analysis link is inactive or restricted.'}</p>
          <Link
            to="/"
            className="w-full py-4 bg-accent hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 transition-all inline-block"
          >
            Re-initiate Drishti
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30" aria-hidden="true">
        <div className="absolute top--[20%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto max-w-3xl relative z-10">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20" aria-hidden="true">
              <FileText className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Analysis Pulse
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80">Public Broadcast Interface</p>
            </div>
          </div>
          
          <Link
            to="/"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl group active:scale-95"
            aria-label="Return to Drishti scanner"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Return to Core
          </Link>
        </motion.header>

        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-morphism p-8 md:p-12 border-white/5">
            {/* Report Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-10 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center" aria-hidden="true">
                  <Globe className="text-slate-400 w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resource Identifier</p>
                  <p className="text-sm font-bold text-white tracking-widest uppercase">{report.publicId}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center" aria-hidden="true">
                  <Clock className="text-slate-400 w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</p>
                  <time
                    dateTime={report.createdAt}
                    className="text-sm font-bold text-white tracking-widest uppercase"
                  >
                    {new Date(report.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </div>
            </div>

            {/* Analysis Content */}
            <div className="space-y-10">
              <section aria-labelledby="report-description-heading">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-accent rounded-full" aria-hidden="true" />
                  <h2 id="report-description-heading" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Neural Interpretation
                  </h2>
                </div>
                <p className="text-xl md:text-2xl font-bold leading-tight text-white/90 selection:bg-accent/30 tracking-tight">
                  {report.description}
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.detectedText && (
                  <motion.section 
                    aria-labelledby="ocr-heading"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-black/40 border border-white/5 rounded-[2rem]"
                  >
                    <h3 id="ocr-heading" className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4">
                      OCR Extracted Text
                    </h3>
                    <p className="text-sm font-bold text-slate-300 leading-relaxed break-words">{report.detectedText}</p>
                  </motion.section>
                )}

                {report.currency && (
                  <motion.section 
                    aria-labelledby="currency-heading"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 bg-black/40 border border-white/5 rounded-[2rem]"
                  >
                    <h3 id="currency-heading" className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">
                      Currency Valorization
                    </h3>
                    <p className="text-sm font-bold text-slate-300 tracking-widest">{report.currency}</p>
                  </motion.section>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
              {/* Listen Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSpeak}
                disabled={isSpeaking}
                aria-label={isSpeaking ? 'Reading aloud…' : 'Listen to this report'}
                className={`h-16 font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all ${
                  isSpeaking
                    ? 'bg-orange-600/80 text-white shadow-accent/10 cursor-wait'
                    : 'bg-accent hover:bg-orange-500 text-white shadow-accent/20'
                }`}
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
                {isSpeaking ? (
                  <>
                    Speaking
                    <span className="flex gap-1 ml-1" aria-hidden="true">
                      <span className="typing-dot opacity-70" />
                      <span className="typing-dot opacity-70" />
                      <span className="typing-dot opacity-70" />
                    </span>
                  </>
                ) : (
                  'Listen to Report'
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShare}
                aria-label={isCopied ? 'Link copied to clipboard' : 'Copy shareable link'}
                className={`h-16 border-2 font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all ${
                  isCopied 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {isCopied
                  ? <CheckCircle className="w-5 h-5" aria-hidden="true" />
                  : <Share2 className="w-5 h-5" aria-hidden="true" />
                }
                {isCopied ? 'Broadcast Copied' : 'Transfer Link'}
              </motion.button>
            </div>
          </div>

          {/* Footer Info */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
            aria-hidden="true"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 mb-2">Powered by Drishti AI Core</p>
            <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest max-w-sm mx-auto leading-loose">
              Visual data processed through secure neural nodes. No personal identifiers are stored within this public broadcast.
            </p>
          </motion.div>
        </motion.main>
      </div>
    </div>
  )
}
