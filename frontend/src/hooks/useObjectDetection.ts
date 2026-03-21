import { useState, useEffect, useRef, useCallback } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'

interface DetectedObject {
  class: string
  score: number
  bbox: [number, number, number, number] // [x, y, width, height]
  position?: string // "top left", etc.
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
  detectObjects: () => Promise<DetectedObject[] | undefined>
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
        await tf.ready() // Ensure tfjs is ready
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
        .filter((pred: { score: number; class: string; bbox: number[] }) => pred.score >= confidenceThreshold)
        .map((pred: { score: number; class: string; bbox: number[] }) => ({
          class: pred.class,
          score: pred.score,
          bbox: pred.bbox as [number, number, number, number]
        }))

      // Map positional logic
      const H = video.videoHeight || video.clientHeight
      const W = video.videoWidth || video.clientWidth

      const formattedPredictions = filteredPredictions.map((pred) => {
        const [x, y, w, h] = pred.bbox
        const centerX = Math.round(x + w / 2)
        const centerY = Math.round(y + h / 2)

        let W_pos = 'center'
        if (centerX < W / 3) {
            W_pos = 'left'
        } else if (centerX > (W / 3) * 2) {
            W_pos = 'right'
        }

        let H_pos = 'mid'
        if (centerY < H / 3) {
            H_pos = 'top'
        } else if (centerY > (H / 3) * 2) {
            H_pos = 'bottom'
        }

        return { ...pred, position: `${H_pos}-${W_pos}` }
      })

      setDetectedObjects(formattedPredictions)

      // Check if target object is detected
      if (targetObject) {
        const targetObj = formattedPredictions.find(
          (obj: DetectedObject) => obj.class.toLowerCase() === targetObject.toLowerCase()
        )
        
        const targetFound = !!targetObj;
        setTargetObjectDetected(targetFound)

        if (targetFound && onTargetFound) {
            onTargetFound(targetObj)
        }
      }
      
      return formattedPredictions

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
