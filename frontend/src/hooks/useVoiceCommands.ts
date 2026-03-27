import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';

export interface UseVoiceCommandsOptions {
  onCommand: (command: string) => void;
}

// Key used to persist continuous-mode state across page navigations
export const MIC_STATE_KEY = 'drishti_mic_continuous';

export const useVoiceCommands = ({ onCommand }: UseVoiceCommandsOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isContinuous, setIsContinuous] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);

  const isContinuousRef = useRef(isContinuous);
  const isManuallyStoppedRef = useRef(false);
  const failCountRef = useRef(0);

  // Echo rejection: timestamp until which we ignore transcripts (post-TTS dead-zone)
  const ignoreUntilRef = useRef<number>(0);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
    // Persist mic state so other pages can read it
    sessionStorage.setItem(MIC_STATE_KEY, isContinuous ? '1' : '0');
  }, [isContinuous]);

  const isSupported = typeof window !== 'undefined' &&
    (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  /**
   * Call this before speaking a response so the mic ignores immediate echo.
   * Capped at 1500ms regardless of text length — just blocks the initial burst,
   * not the entire TTS duration.
   */
  const muteFor = useCallback((_text: string) => {
    // Short fixed dead-zone (1.5s) to catch the audio burst at TTS start.
    // Do NOT scale by text length — that blocks commands for 30+ seconds.
    ignoreUntilRef.current = Date.now() + 1500;
  }, []);

  /**
   * Returns true only if we are inside the short post-TTS dead-zone.
   * Substring matching removed — too dangerous (blocks real commands).
   */
  const isEcho = (transcript: string): boolean => {
    if (Date.now() < ignoreUntilRef.current) {
      console.debug('[VoiceCmd] Echo dead-zone, ignored:', transcript);
      return true;
    }
    return false;
  };

  const startListening = useCallback(async (isAutoRestart = false) => {
    if (!isSupported) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError("Voice recognition requires a secure connection.");
      return;
    }
    if (isListening || isStarting) return;

    if (!isAutoRestart) {
      isManuallyStoppedRef.current = false;
      failCountRef.current = 0;
    }

    setIsStarting(true);
    setMicError(null);

    // Only request mic permission on first (manual) open
    if (!isAutoRestart) {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        setIsStarting(false);
        const errMsg = "Microphone access blocked. Please allow permissions.";
        setMicError(errMsg);
        if (failCountRef.current === 0) speechService.speak(errMsg);
        return;
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsStarting(false);
      setIsListening(true);
      setMicError(null);
      failCountRef.current = 0;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      // 8-second silence timeout (non-continuous only)
      if (!isContinuousRef.current) {
        timeoutRef.current = window.setTimeout(() => {
          recognition.stop();
          setIsListening(false);
          speechService.speak("Silence detected. Standing by.");
        }, 8000);
      }
    };

    recognition.onresult = (event: any) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      const transcript = event.results[0][0].transcript.toLowerCase().trim();

      // Echo rejection: drop this if we're in the post-TTS dead-zone OR it looks like our own speech
      if (isEcho(transcript)) {
        console.debug('[VoiceCmd] Echo rejected:', transcript);
        return;
      }
      onCommand(transcript);
    };

    recognition.onerror = async (event: any) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      console.error('Speech recognition error:', event.error);
      setIsStarting(false);
      setIsListening(false);
      failCountRef.current += 1;

      let errorHandled = false;

      if (event.error === 'network') {
        const isBrave = (navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function'
          ? await (navigator as any).brave.isBrave()
          : false;
        if (isBrave) {
          const err = "Brave Browser blocks Speech Recognition. Switch to Chrome or enable Google services.";
          setMicError(err);
          if (failCountRef.current === 1) speechService.speak("Brave browser is blocking the microphone.");
        } else {
          const err = "Voice recognition requires a secure connection.";
          setMicError(err);
          if (failCountRef.current === 1) speechService.speak("Network error. Use a secure connection.");
        }
        errorHandled = true;
      } else if (event.error === 'not-allowed') {
        const err = "Microphone permission denied.";
        setMicError(err);
        if (failCountRef.current === 1) speechService.speak(err);
        errorHandled = true;
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        // Don't speak "didn't catch that" in continuous mode — too noisy
        if (!isContinuousRef.current) speechService.speak("Sorry, I didn't catch that.");
      }

      if (errorHandled || failCountRef.current > 3) {
        if (failCountRef.current > 3 && !errorHandled) {
          setMicError("Voice engine degraded. Deactivating.");
          speechService.speak("Voice engine degraded. Halting.");
        }
        setIsContinuous(false);
        isContinuousRef.current = false;
      }
    };

    recognition.onend = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setIsStarting(false);
      setIsListening(false);
      recognitionRef.current = null;

      // ── Auto-restart in continuous mode ─────────────────────────────
      // IMPORTANT: we use a FIXED short delay (250ms), not waitForSpeechToEnd.
      // Chrome's built-in AEC handles echo rejection. The muteFor() + isEcho()
      // filter above catches any residual echo that slips through.
      if (isContinuousRef.current && !isManuallyStoppedRef.current && failCountRef.current <= 3) {
        window.setTimeout(() => {
          if (isContinuousRef.current && !isManuallyStoppedRef.current) {
            startListening(true);
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      if (!isContinuousRef.current || !isAutoRestart) {
        speechService.speak("Listening", { rate: 1.2, pitch: 1.5, volume: 0.5 });
      }
    } catch (e) {
      console.error("Failed to start mic:", e);
      setIsStarting(false);
      setIsListening(false);
      failCountRef.current += 1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, isStarting, onCommand, isSupported]);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current && (isListening || isStarting)) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      recognitionRef.current.stop();
      setIsListening(false);
      setIsStarting(false);
    }
  }, [isListening, isStarting]);

  const resetError = useCallback(() => {
    setMicError(null);
    failCountRef.current = 0;
  }, []);

  const toggleContinuousMode = useCallback(() => {
    setIsContinuous(prev => {
      const next = !prev;
      if (!next && isListening) stopListening();
      return next;
    });
  }, [isListening, stopListening]);

  return {
    isListening,
    isStarting,
    isContinuous,
    isSupported,
    micError,
    muteFor,
    startListening,
    stopListening,
    resetError,
    toggleContinuousMode,
  };
};
