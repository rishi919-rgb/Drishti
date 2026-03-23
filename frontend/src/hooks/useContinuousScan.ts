import { useState, useEffect, useRef, useCallback } from 'react'
import { GeminiService } from '../services/gemini'
import { speechService } from '../services/speech'
import { apiService } from '../services/api'
import { faceRecognitionService } from '../services/faceRecognition'

interface UseContinuousScanOptions {
  scanInterval?: number // milliseconds between scans (default: 1500ms)
  maxImageWidth?: number 
  maxImageHeight?: number 
  imageQuality?: number 
}

type ScanMode = 'object' | 'path' | 'face';

interface UseContinuousScanReturn {
  isScanning: boolean
  isAnalyzing: boolean
  lastAnalysis: string
  error: string
  currentMode: ScanMode
  startScanning: (mode: ScanMode) => void
  stopScanning: () => void
  captureOnce: (mode: ScanMode) => Promise<void>
}

export const useContinuousScan = (
  captureImage: () => string | null,
  isCameraActive: boolean,
  _detectObjects: () => Promise<any[] | undefined>,
  options: UseContinuousScanOptions = {}
): UseContinuousScanReturn => {
  const {
    scanInterval = 1500,
    maxImageWidth = 640,
    maxImageHeight = 480,
    imageQuality = 0.7
  } = options

  const [isScanning, setIsScanning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState('')
  const [error, setError] = useState('')
  const [currentMode, setCurrentMode] = useState<ScanMode>('object')

  const timeoutRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false)
  const consecutiveErrorsRef = useRef(0)
  const geminiService = useRef(new GeminiService())

  const compressImage = useCallback((base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxImageWidth || height > maxImageHeight) {
          const aspectRatio = width / height
          if (width > height) {
            width = maxImageWidth
            height = width / aspectRatio
          } else {
            height = maxImageHeight
            width = height * aspectRatio
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', imageQuality))
        } else {
          resolve(base64Image)
        }
      }
      img.onerror = () => resolve(base64Image)
      img.src = base64Image
    })
  }, [maxImageWidth, maxImageHeight, imageQuality])

  const runScanLoop = useCallback(async (mode: ScanMode) => {
    if (!isProcessingRef.current && isCameraActive) {
      isProcessingRef.current = true
      setIsAnalyzing(true)

      try {
        const imageData = captureImage()
        if (imageData) {
          if (mode === 'face') {
            // Client-side Face Recognition
            const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
            if (videoElement) {
              const name = await faceRecognitionService.recognizeFace(videoElement);
              if (name) {
                const text = `That's ${name}`;
                setLastAnalysis(text);
                await speechService.speak(text);
              } else {
                // Fallback to object detection if no face recognized
                await performObjectAnalysis(imageData);
              }
            }
          } else if (mode === 'path') {
            const result = await apiService.analyzePath({ imageBase64: imageData });
            if (result.success && result.guidance) {
              setLastAnalysis(result.guidance);
              await speechService.speak(result.guidance);
            }
          } else {
            // Object Mode (Legacy/Proxy)
            await performObjectAnalysis(imageData);
          }
        }
      } catch (err: any) {
        console.error("Scan loop error:", err);
        setError(`Error: ${err.message || 'Network failure'}`);
        // Allow loop to continue automatically via finally block
      } finally {
        isProcessingRef.current = false
        setIsAnalyzing(false)
        
        // Schedule next scan after delay if still scanning
        if (timeoutRef.current !== null) {
          timeoutRef.current = window.setTimeout(() => runScanLoop(mode), scanInterval);
        }
      }
    }
  }, [captureImage, isCameraActive, scanInterval]);

  const performObjectAnalysis = async (imageData: string) => {
    const compressed = await compressImage(imageData);
    const result = await geminiService.current.analyzeImage(
      compressed,
      "Describe this scene in 1-2 simple sentences for a blind person. If text is visible, read it. If Indian currency, identify denomination."
    );
    
    if (result.error) throw new Error(result.error);
    
    let text = result.description;
    if (result.textFound) text += ` Text found: ${result.textFound}`;
    if (result.currency) text += ` Currency: ${result.currency}`;
    
    setLastAnalysis(text);
    await speechService.speak(text);
  };

  const startScanning = useCallback((mode: ScanMode) => {
    if (!isCameraActive) {
      setError('Camera is not active')
      return
    }
    setIsScanning(true)
    setCurrentMode(mode)
    setError('')
    
    // Initial call
    timeoutRef.current = window.setTimeout(() => runScanLoop(mode), 100);
  }, [isCameraActive, runScanLoop])

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    speechService.stop()
  }, [])

  const captureOnce = useCallback(async (mode: ScanMode) => {
    if (!isCameraActive) return
    const imageData = captureImage()
    if (imageData) {
      isProcessingRef.current = true
      setIsAnalyzing(true)
      try {
        if (mode === 'face') {
          const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
          if (videoElement) {
            const name = await faceRecognitionService.recognizeFace(videoElement);
            if (name) {
              const text = `That's ${name}`;
              setLastAnalysis(text);
              await speechService.speak(text);
            } else {
              await performObjectAnalysis(imageData);
            }
          }
        } else if (mode === 'path') {
          const result = await apiService.analyzePath({ imageBase64: imageData });
          if (result.success && result.guidance) {
            setLastAnalysis(result.guidance);
            await speechService.speak(result.guidance);
          }
        } else {
          await performObjectAnalysis(imageData);
        }
      } catch (err: any) {
        setError(`Error: ${err.message || 'Capture failed'}`);
      } finally {
        isProcessingRef.current = false
        setIsAnalyzing(false)
      }
    }
  }, [isCameraActive, captureImage])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isScanning,
    isAnalyzing,
    lastAnalysis,
    error,
    currentMode,
    startScanning,
    stopScanning,
    captureOnce
  }
}
