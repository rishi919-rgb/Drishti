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
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const current = this.queue.shift();
    
    if (!current) {
        this.processing = false;
        return;
    }

    const { text, options, resolve, reject } = current;
    this.currentUtterance = new SpeechSynthesisUtterance(text);
      
    this.currentUtterance.rate = options.rate || 0.9 
    this.currentUtterance.pitch = options.pitch || 1.0
    this.currentUtterance.volume = options.volume || 1.0
    
    const voice = this.getPreferredVoice()
    if (voice) {
      this.currentUtterance.voice = voice
    }

    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      this.currentUtterance = null;
      this.processing = false;
      this.processQueue();
    };

    this.currentUtterance.addEventListener('end', () => {
      cleanup();
      resolve();
    });

    this.currentUtterance.addEventListener('error', (event) => {
      cleanup();
      resolve(); // Resolve anyway on error to not block the loop
    });

    // 5 second fallback timeout
    timeoutId = window.setTimeout(() => {
      console.warn('Speech synthesis timeout fallback triggered');
      this.synth.cancel(); // Try to clear the stuck speech
      cleanup();
      resolve();
    }, 5000);

    this.synth.speak(this.currentUtterance);
  }

  speak(text: string, options: {
    rate?: number
    pitch?: number
    volume?: number
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        resolve(); // Resolve to not block
        return;
      }

      if (!text || text.trim() === '') {
        resolve();
        return;
      }

      this.queue.push({ text, options, resolve, reject });
      this.processQueue();
    });
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
