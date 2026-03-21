class SpeechService {
  private synth: SpeechSynthesis
  private voices: SpeechSynthesisVoice[] = []
  private isSupported: boolean
  private queue: { text: string; options: any; resolve: () => void; reject: (err: Error) => void }[] = []
  private processing: boolean = false

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
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const current = this.queue.shift();
    
    if (!current) {
        this.processing = false;
        return;
    }

    const { text, options, resolve, reject } = current;
    const utterance = new SpeechSynthesisUtterance(text);
      
    utterance.rate = options.rate || 0.9 
    utterance.pitch = options.pitch || 1.0
    utterance.volume = options.volume || 1.0
    
    const voice = this.getPreferredVoice()
    if (voice) {
      utterance.voice = voice
    }

    utterance.addEventListener('end', () => {
      this.processing = false;
      resolve();
      this.processQueue();
    });

    utterance.addEventListener('error', (event) => {
      this.processing = false;
      reject(new Error(`Speech error: ${event.error}`));
      this.processQueue();
    });

    this.synth.speak(utterance);
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

      this.queue.push({ text, options, resolve, reject });
      this.processQueue();
    })
  }

  stop(): void {
    if (this.isSupported) {
      this.synth.cancel()
      this.queue = [];
      this.processing = false;
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

export const speechService = new SpeechService();
