import { useState, useEffect, useRef, useCallback } from 'react'
import { GeminiService } from '../services/gemini'
import { speechService } from '../services/speech'

interface UseContinuousScanOptions {
  scanInterval?: number // milliseconds between scans (default: 2500ms)
  maxImageWidth?: number // max width for captured images (default: 640)
  maxImageHeight?: number // max height for captured images (default: 480)
  imageQuality?: number // JPEG quality 0-1 (default: 0.7)
}

interface UseContinuousScanReturn {
  isScanning: boolean
  isAnalyzing: boolean
  lastAnalysis: string
  error: string
  startScanning: () => void
  stopScanning: () => void
  captureOnce: () => Promise<void>
}

interface DetectedObject {
  class: string
  score: number
  bbox: [number, number, number, number]
  position?: string
}

export const useContinuousScan = (
  captureImage: () => string | null,
  isCameraActive: boolean,
  detectObjects: () => Promise<DetectedObject[] | undefined>,
  options: UseContinuousScanOptions = {}
): UseContinuousScanReturn => {
  const {
    scanInterval = 2500,
    maxImageWidth = 640,
    maxImageHeight = 480,
    imageQuality = 0.7
  } = options

  const [isScanning, setIsScanning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState('')
  const [error, setError] = useState('')

  const intervalRef = useRef<number | null>(null)
  const isAnalyzingRef = useRef(false)
  const geminiService = useRef(new GeminiService())


  const compressImage = useCallback((base64Image: string): Promise<string> => {
    return new Promise((resolve: (value: string) => void) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        
        // Calculate new dimensions maintaining aspect ratio
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
          resolve(base64Image) // Fallback to original
        }
      }
      img.onerror = () => resolve(base64Image) // Fallback to original
      img.src = base64Image
    })
  }, [maxImageWidth, maxImageHeight, imageQuality])

  const analyzeImage = useCallback(async (imageData: string | null): Promise<void> => {
    if (!imageData || isAnalyzingRef.current) {
      return
    }

    isAnalyzingRef.current = true
    setIsAnalyzing(true)
    setError('')

    try {
      // Compress image before sending
      const compressedImage = await compressImage(imageData)
      
      // Analyze with AI
      const result = await geminiService.current.analyzeImage(
        compressedImage,
        "Describe this scene in 1-2 simple sentences for a blind person. If text is visible, read it. If Indian currency, identify denomination."
      )

      if (result.error) {
        throw new Error(result.error)
      }

      // Format the analysis text
      let analysisText = result.description
      if (result.textFound) {
        analysisText += ` Text found: ${result.textFound}`
      }
      if (result.currency) {
        analysisText += ` Currency: ${result.currency}`
      }

      setLastAnalysis(analysisText)

      // Speak the result
      try {
        await speechService.speak(analysisText)
      } catch (speechError) {
        console.error('Speech error:', speechError)
        // Continue even if speech fails
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setError(errorMessage)
      
      // Speak the error
      try {
        await speechService.speak(`Error: ${errorMessage}`)
      } catch (speechError) {
        console.error('Speech error:', speechError)
      }
    } finally {
      setIsAnalyzing(false)
      isAnalyzingRef.current = false
    }
  }, [compressImage])

  const captureOnce = useCallback(async (): Promise<void> => {
    if (!isCameraActive) {
      setError('Camera is not active')
      return
    }

    const imageData = captureImage()
    if (!imageData) {
      setError('Failed to capture image')
      return
    }

    await analyzeImage(imageData)
  }, [isCameraActive, captureImage, analyzeImage])

  const startScanning = useCallback(() => {
    if (!isCameraActive) {
      setError('Camera is not active. Cannot start scanning.')
      return
    }

    setIsScanning(true)
    setError('')

    // Capture immediately on start
    captureOnce()

    // Then set up interval
    intervalRef.current = window.setInterval(async () => {
      if (!isAnalyzingRef.current) {
        try {
          const objs = await detectObjects();
          if (objs && objs.length > 0) {
            const uniqueObjs = Array.from(new Set(objs.map(o => `${o.position} ${o.class}`)));
            const descriptions = uniqueObjs.join(', ');
            await speechService.speak(descriptions);
          }
        } catch (e) {
          console.error("Local object detection error:", e);
        }
      }
    }, scanInterval)
  }, [isCameraActive, captureOnce, scanInterval, detectObjects])

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Stop any ongoing speech
    speechService.stop()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
      speechService.stop()
    }
  }, [])

  return {
    isScanning,
    isAnalyzing,
    lastAnalysis,
    error,
    startScanning,
    stopScanning,
    captureOnce
  }
}
