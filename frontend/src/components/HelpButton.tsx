import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X } from 'lucide-react'
import { speechService } from '../services/speech'
import { announce } from '../utils/announce'
import { useHaptic } from '../hooks/useHaptic'

const TIPS = [
  "Say 'start scanning' to begin continuous AI vision, or 'stop scanning' to halt it.",
  "Say 'capture once' or 'what's in front of me' to take an instant snapshot.",
  "Switch modes by saying 'object mode', 'path mode', or 'face mode'.",
  "Ask about government schemes by saying 'tell me about PM Kisan' or 'what is Ayushman Bharat'.",
  "Ask about medicines by saying 'tell me about paracetamol'.",
  "Save your analyses by logging in and tapping the Archive Data button.",
  "Use the History page to review and replay past analyses.",
  "The microphone button activates voice command listening.",
]

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const { tap, confirm } = useHaptic()

  const speakTip = (index: number) => {
    const tip = TIPS[index]
    speechService.speak(tip)
    announce(tip, 'assertive')
  }

  const handleOpen = () => {
    tap()
    const idx = Math.floor(Math.random() * TIPS.length)
    setCurrentTipIndex(idx)
    setIsOpen(true)
    speakTip(idx)
  }

  const handleClose = () => {
    tap()
    speechService.stop()
    setIsOpen(false)
  }

  const handleNextTip = () => {
    confirm()
    const nextIdx = (currentTipIndex + 1) % TIPS.length
    setCurrentTipIndex(nextIdx)
    speakTip(nextIdx)
  }

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={handleOpen}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Help – tap to hear usage tips"
        title="Help & Usage Tips"
        className="fixed bottom-24 right-6 z-[100] w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-colors touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <HelpCircle className="w-6 h-6" aria-hidden="true" />
      </motion.button>

      {/* Tip Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Help Tips"
            className="fixed bottom-44 right-4 z-[101] w-80 max-w-[calc(100vw-2rem)] bg-[#14141e] border border-indigo-500/30 rounded-3xl shadow-2xl shadow-indigo-900/40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                  Usage Tip
                </span>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close help"
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Tip content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentTipIndex}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-bold text-white leading-relaxed"
                >
                  {TIPS[currentTipIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={handleNextTip}
                  className="flex-1 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all touch-manipulation"
                  aria-label="Hear next tip"
                >
                  🎲 Next Tip
                </button>
                <button
                  onClick={() => speakTip(currentTipIndex)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all touch-manipulation"
                  aria-label="Repeat this tip"
                >
                  🔊 Repeat
                </button>
              </div>

              {/* Tip counter dots */}
              <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
                {TIPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentTipIndex ? 'bg-indigo-500 w-3' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
