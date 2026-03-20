import { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'

interface FaceDescriptor {
  name: string
  descriptor: Float32Array
  createdAt: string
}

interface DetectedFace {
  detection: any  // Using any to avoid faceapi type issues
  descriptor: Float32Array
  matchedName?: string
  distance?: number
}

interface UseFaceRecognitionOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  isEnabled: boolean
  onFaceDetected?: (face: DetectedFace) => void
  onFaceRecognized?: (face: DetectedFace) => void
}

interface UseFaceRecognitionReturn {
  isModelLoading: boolean
  isModelLoaded: boolean
  modelError: string
  detectedFaces: DetectedFace[]
  isDetecting: boolean
  enrollFace: (name: string) => Promise<boolean>
  detectFaces: () => Promise<void>
}

// IndexedDB database name and version
const DB_NAME = 'DrishtiFacesDB'
const DB_VERSION = 1
const STORE_NAME = 'faceDescriptors'

export const useFaceRecognition = ({
  videoRef,
  isEnabled,
  onFaceDetected,
  onFaceRecognized
}: UseFaceRecognitionOptions): UseFaceRecognitionReturn => {
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [modelError, setModelError] = useState('')
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

  const modelsLoadedRef = useRef(false)
  const enrolledFacesRef = useRef<FaceDescriptor[]>([])
  const isDetectingRef = useRef(false)

  // Load face-api.js models
  useEffect(() => {
    if (!isEnabled || modelsLoadedRef.current) return

    const loadModels = async () => {
      setIsModelLoading(true)
      setModelError('')

      try {
        // Load models from public/models directory (you'll need to download these)
        const MODEL_URL = '/models'

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ])

        modelsLoadedRef.current = true
        setIsModelLoaded(true)
        console.log('Face-api.js models loaded successfully')

        // Load enrolled faces from IndexedDB
        await loadEnrolledFaces()
      } catch (error) {
        console.error('Failed to load face recognition models:', error)
        setModelError('Failed to load face recognition models. Make sure model files are in /public/models')
      } finally {
        setIsModelLoading(false)
      }
    }

    loadModels()
  }, [isEnabled])

  // Initialize IndexedDB
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'name' })
        }
      }
    })
  }

  // Load enrolled faces from IndexedDB
  const loadEnrolledFaces = async () => {
    try {
      const db = await initDB()
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const faces = request.result.map((face: any) => ({
            name: face.name,
            descriptor: new Float32Array(face.descriptor),
            createdAt: face.createdAt
          }))
          enrolledFacesRef.current = faces
          console.log(`Loaded ${faces.length} enrolled faces`)
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to load enrolled faces:', error)
    }
  }

  // Save face descriptor to IndexedDB
  const saveFaceDescriptor = async (name: string, descriptor: Float32Array): Promise<boolean> => {
    try {
      const db = await initDB()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const faceData = {
        name,
        descriptor: Array.from(descriptor),
        createdAt: new Date().toISOString()
      }

      return new Promise((resolve, reject) => {
        const request = store.put(faceData)
        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to save face descriptor:', error)
      return false
    }
  }

  // Enroll a new face
  const enrollFace = useCallback(async (name: string): Promise<boolean> => {
    if (!videoRef.current || !modelsLoadedRef.current) {
      return false
    }

    const video = videoRef.current
    if (video.readyState !== 4) {
      return false
    }

    try {
      // Detect face and get descriptor
      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        console.log('No face detected for enrollment')
        return false
      }

      // Save to IndexedDB
      const saved = await saveFaceDescriptor(name, detection.descriptor)
      
      if (saved) {
        // Add to memory cache
        enrolledFacesRef.current.push({
          name,
          descriptor: detection.descriptor,
          createdAt: new Date().toISOString()
        })
        console.log(`Face enrolled: ${name}`)
      }

      return saved
    } catch (error) {
      console.error('Face enrollment error:', error)
      return false
    }
  }, [videoRef])

  // Find best matching enrolled face
  const findBestMatch = (descriptor: Float32Array): { name: string; distance: number } | null => {
    const enrolledFaces = enrolledFacesRef.current
    if (enrolledFaces.length === 0) return null

    let bestMatch: { name: string; distance: number } | null = null
    let bestDistance = Infinity

    for (const enrolledFace of enrolledFaces) {
      const distance = faceapi.euclideanDistance(descriptor, enrolledFace.descriptor)
      if (distance < bestDistance) {
        bestDistance = distance
        bestMatch = { name: enrolledFace.name, distance }
      }
    }

    // Threshold for face recognition (0.6 is typically a good balance)
    if (bestMatch && bestDistance < 0.6) {
      return bestMatch
    }

    return null
  }

  // Detect faces in current video frame
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !modelsLoadedRef.current || isDetectingRef.current) {
      return
    }

    const video = videoRef.current
    if (video.readyState !== 4) {
      return
    }

    isDetectingRef.current = true
    setIsDetecting(true)

    try {
      // Detect all faces with descriptors
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors()

      const faces: DetectedFace[] = detections.map((detection: any) => {
        const match = findBestMatch(detection.descriptor)
        
        const face: DetectedFace = {
          detection: detection.detection,
          descriptor: detection.descriptor,
          matchedName: match?.name,
          distance: match?.distance
        }

        // Callbacks
        if (onFaceDetected) {
          onFaceDetected(face)
        }
        
        if (match && onFaceRecognized) {
          onFaceRecognized(face)
        }

        return face
      })

      setDetectedFaces(faces)

    } catch (error) {
      console.error('Face detection error:', error)
    } finally {
      isDetectingRef.current = false
      setIsDetecting(false)
    }
  }, [videoRef, onFaceDetected, onFaceRecognized])

  return {
    isModelLoading,
    isModelLoaded,
    modelError,
    detectedFaces,
    isDetecting,
    enrollFace,
    detectFaces
  }
}
