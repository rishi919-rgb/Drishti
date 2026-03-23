import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';

export interface UseVoiceCommandsOptions {
  onCommand: (command: string) => void;
}

export const useVoiceCommands = ({ onCommand }: UseVoiceCommandsOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isContinuous, setIsContinuous] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);
  
  // Storing continuous state mathematically in useRef so closures never catch stale data
  const isContinuousRef = useRef(isContinuous);
  const isManuallyStoppedRef = useRef(false);
  const failCountRef = useRef(0);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // Safely check for support without utilizing SSR triggers.
  const isSupported = typeof window !== 'undefined' && 
                     (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const startListening = useCallback(async (isAutoRestart = false) => {
    if (!isSupported) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError("Voice recognition requires a secure connection. Make sure you are using localhost or HTTPS.");
      return;
    }

    if (isListening || isStarting) return;

    if (!isAutoRestart) {
       isManuallyStoppedRef.current = false;
       failCountRef.current = 0;
    }

    setIsStarting(true);
    setMicError(null);

    // Prompt user visually for DOM permission override
    if (!isAutoRestart) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } else {
          throw new Error("getUserMedia not supported");
        }
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        setIsStarting(false);
        const errMsg = "Microphone access blocked. Please allow permissions in your browser.";
        setMicError(errMsg);
        if (failCountRef.current === 0) speechService.speak(errMsg);
        return;
      }
    }

    // We instantiate the class entirely WITHIN the function block dynamically.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // We manage custom recursion to prevent Chrome native bugs
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsStarting(false);
      setIsListening(true);
      setMicError(null);
      failCountRef.current = 0; // Hardware connected successfully
      
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      
      if (!isContinuousRef.current) {
        timeoutRef.current = window.setTimeout(() => {
          recognition.stop();
          setIsListening(false);
          speechService.speak("Silence detected. Standing by.");
        }, 5000);
      }
    };

    recognition.onresult = (event: any) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      const command = event.results[0][0].transcript.toLowerCase().trim();
      onCommand(command);
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
          const err = "Brave Browser blocks Speech Recognition natively. Please enable 'Use Google services for push messaging' in brave://settings/privacy or switch to Chrome.";
          setMicError(err);
          if (failCountRef.current === 1) speechService.speak("Brave browser is actively blocking the microphone proxy. Please check your browser privacy settings.");
        } else {
          const err = "Voice recognition requires a secure connection. Make sure you are using localhost or HTTPS.";
          setMicError(err);
          if (failCountRef.current === 1) speechService.speak("Network error. Make sure you are using a secure connection.");
        }
        errorHandled = true;
      } else if (event.error === 'not-allowed') {
        const err = "Microphone permission denied.";
        setMicError(err);
        if (failCountRef.current === 1) speechService.speak(err);
        errorHandled = true;
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        if (!isContinuousRef.current) speechService.speak("Sorry, I didn't catch that command.");
      }

      // Hard break continuous surveillance if environment keeps faulting out to prevent infinite TTS spam
      if (errorHandled || failCountRef.current > 3) {
         if (failCountRef.current > 3 && !errorHandled) {
             setMicError("Continuous silent failures. Voice engine automatically deactivated.");
             speechService.speak("Voice engine degraded. Halting continuous monitoring loop.");
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
      
      // Auto-reboot loop logic
      if (isContinuousRef.current && !isManuallyStoppedRef.current && failCountRef.current <= 3) {
         window.setTimeout(() => {
            if (isContinuousRef.current && !isManuallyStoppedRef.current) {
               startListening(true);
            }
         }, 500);
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
        const nextState = !prev;
        if (!nextState && isListening) {
           stopListening(); // If user turns it off, dynamically severe the current connection stream
        }
        return nextState;
    });
  }, [isListening, stopListening]);

  return {
    isListening,
    isStarting,
    isContinuous,
    isSupported,
    micError,
    startListening,
    stopListening,
    resetError,
    toggleContinuousMode
  };
};
