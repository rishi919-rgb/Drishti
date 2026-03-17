export class SpeechService {
  private synth: SpeechSynthesis
  private voices: SpeechSynthesisVoice[] = []
  private isSupported: boolean

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
    
    // Voices load asynchronously, so we need to listen for the event
    this.synth.addEventListener('voiceschanged', updateVoices)
  }

  private getPreferredVoice(): SpeechSynthesisVoice | null {
    // Prefer English voices, with preference for clearer voices
    const preferredLanguages = ['en-US', 'en-GB', 'en-IN', 'en']
    
    for (const lang of preferredLanguages) {
      const voice = this.voices.find(v => v.lang.startsWith(lang))
      if (voice) return voice
    }
    
    return this.voices[0] || null
  }

  speak(text: string, options: {
    rate?: number
    pitch?: number
    volume?: number
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Text-to-speech not supported in this browser'))
        return
      }

      if (!text || text.trim() === '') {
        resolve()
        return
      }

      // Cancel any ongoing speech
      this.synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Configure speech parameters for clarity
      utterance.rate = options.rate || 0.9 // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0
      
      // Set preferred voice
      const voice = this.getPreferredVoice()
      if (voice) {
        utterance.voice = voice
      }

      utterance.onend = () => {
        resolve()
      }

      utterance.onerror = (event) => {
        reject(new Error(`Speech error: ${event.error}`))
      }

      this.synth.speak(utterance)
    })
  }

  stop(): void {
    if (this.isSupported) {
      this.synth.cancel()
    }
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
