import { useState, useEffect, useRef, useCallback } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'

interface DetectedObject {
  class: string
  score: number
  bbox: [number, number, number, number] // [x, y, width, height]
}

interface UseObjectDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  isEnabled: boolean
  targetObject?: string // Specific object to find (e.g., "person", "bottle")
  onTargetFound?: (object: DetectedObject) => void
  confidenceThreshold?: number // Default: 0.5
}

interface UseObjectDetectionReturn {
  isModelLoading: boolean
  isModelLoaded: boolean
  modelError: string
  detectedObjects: DetectedObject[]
  isDetecting: boolean
  targetObjectDetected: boolean
  detectObjects: () => Promise<void>
}

export const useObjectDetection = ({
  videoRef,
  isEnabled,
  targetObject,
  onTargetFound,
  confidenceThreshold = 0.5
}: UseObjectDetectionOptions): UseObjectDetectionReturn => {
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [modelError, setModelError] = useState('')
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [targetObjectDetected, setTargetObjectDetected] = useState(false)

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const isDetectingRef = useRef(false)

  // Load COCO-SSD model
  useEffect(() => {
    if (!isEnabled) return

    const loadModel = async () => {
      setIsModelLoading(true)
      setModelError('')

      try {
        // Load COCO-SSD model (lightweight object detection)
        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Lightweight version for mobile
        })
        
        modelRef.current = model
        setIsModelLoaded(true)
        console.log('COCO-SSD model loaded successfully')
      } catch (error) {
        console.error('Failed to load COCO-SSD model:', error)
        setModelError('Failed to load object detection model')
      } finally {
        setIsModelLoading(false)
      }
    }

    loadModel()
  }, [isEnabled])

  const detectObjects = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || isDetectingRef.current) {
      return
    }

    const video = videoRef.current
    if (video.readyState !== 4) { // HAVE_ENOUGH_DATA
      return
    }

    isDetectingRef.current = true
    setIsDetecting(true)

    try {
      // Detect objects in current video frame
      const predictions = await modelRef.current.detect(video)
      
      // Filter by confidence threshold
      const filteredPredictions = predictions
        .filter(pred => pred.score >= confidenceThreshold)
        .map(pred => ({
          class: pred.class,
          score: pred.score,
          bbox: pred.bbox as [number, number, number, number]
        }))

      setDetectedObjects(filteredPredictions)

      // Check if target object is detected
      if (targetObject) {
        const targetFound = filteredPredictions.some(
          obj => obj.class.toLowerCase() === targetObject.toLowerCase()
        )
        
        setTargetObjectDetected(targetFound)

        if (targetFound && onTargetFound) {
          const targetObj = filteredPredictions.find(
            obj => obj.class.toLowerCase() === targetObject.toLowerCase()
          )
          if (targetObj) {
            onTargetFound(targetObj)
          }
        }
      }

    } catch (error) {
      console.error('Object detection error:', error)
    } finally {
      isDetectingRef.current = false
      setIsDetecting(false)
    }
  }, [videoRef, targetObject, onTargetFound, confidenceThreshold])

  return {
    isModelLoading,
    isModelLoaded,
    modelError,
    detectedObjects,
    isDetecting,
    targetObjectDetected,
    detectObjects
  }
}
