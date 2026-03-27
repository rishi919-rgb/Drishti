class SpeechService {
  private synth: SpeechSynthesis
  private voices: SpeechSynthesisVoice[] = []
  private isSupported: boolean
  private queue: { text: string; options: any; resolve: () => void; reject: (err: Error) => void }[] = []
  private processing: boolean = false
  private currentUtterance: SpeechSynthesisUtterance | null = null

  constructor() {
    this.synth = window.speechSynthesis
    this.isSupported = 'speechSynthesis' in window
    
    if (this.isSupported) {
      this.loadVoices()
    }
  }

  private loadVoices(): void {
    const updateVoices = () => {
      this.voices = this.synth.getVoices()
    }
    updateVoices()
    this.synth.addEventListener('voiceschanged', updateVoices)
  }

  private getPreferredVoice(): SpeechSynthesisVoice | null {
    const preferredLanguages = ['en-US', 'en-GB', 'en-IN', 'en']
    for (const lang of preferredLanguages) {
      const voice = this.voices.find(v => v.lang.startsWith(lang))
      if (voice) return voice
    }
    return this.voices[0] || null
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    const current = this.queue.shift()

    if (!current) {
      this.processing = false
      return
    }

    const { text, options, resolve } = current
    this.currentUtterance = new SpeechSynthesisUtterance(text)

    this.currentUtterance.rate   = options.rate   || 0.9
    this.currentUtterance.pitch  = options.pitch  || 1.0
    this.currentUtterance.volume = options.volume || 1.0

    const voice = this.getPreferredVoice()
    if (voice) {
      this.currentUtterance.voice = voice
    }

    let timeoutId: number | null = null

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      this.currentUtterance = null
      this.processing = false
      this.processQueue()
    }

    this.currentUtterance.addEventListener('end', () => {
      cleanup()
      resolve()
    })

    this.currentUtterance.addEventListener('error', () => {
      cleanup()
      resolve() // Resolve anyway to not block the loop
    })

    // Fallback timeout: ~90ms per character, minimum 8 s
    const fallbackDuration = Math.max(8000, text.length * 90)
    timeoutId = window.setTimeout(() => {
      console.warn('Speech synthesis timeout fallback triggered.')
      this.synth.cancel()
      cleanup()
      resolve()
    }, fallbackDuration)

    this.synth.speak(this.currentUtterance)
  }

  // ── Public API ────────────────────────────────────────────────────

  /** Enqueue text to be spoken after any currently-playing speech. */
  speak(text: string, options: {
    rate?: number
    pitch?: number
    volume?: number
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) { resolve(); return }
      if (!text || text.trim() === '') { resolve(); return }
      this.queue.push({ text, options, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Interrupt any current speech, clear the queue, and immediately speak
   * the given text. Use this for voice-command confirmations so they are
   * heard without delay regardless of what was playing.
   */
  speakNow(text: string, options: {
    rate?: number
    pitch?: number
    volume?: number
  } = {}): Promise<void> {
    this.interrupt()
    return this.speak(text, options)
  }

  /**
   * Cancel the current utterance and flush the queue.
   * Any pending speak() promises resolve immediately.
   */
  interrupt(): void {
    if (!this.isSupported) return
    // Resolve any queued promises so callers don't hang
    this.queue.forEach(item => item.resolve())
    this.queue = []
    this.processing = false
    this.currentUtterance = null
    this.synth.cancel()
  }

  /** Stop all speech (alias for interrupt, kept for backwards compatibility). */
  stop(): void {
    this.interrupt()
  }

  isSpeaking(): boolean {
    return this.isSupported ? this.synth.speaking : false
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  isSpeechSupported(): boolean {
    return this.isSupported
  }
}

export const speechService = new SpeechService()
