import * as faceapi from '@vladmandic/face-api';
import { faceStorageService, StoredFace } from './faceStorage';

// Official models CDN (stable for face-api.js v0.22.2 and vladmandic fork)
const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

class FaceRecognitionService {
  private isLoaded = false;
  private isLoading = false;
  private labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];

  /**
   * Loads face-api models from CDN and preloads saved faces from storage
   */
  async loadModels() {
    if (this.isLoaded || this.isLoading) return;
    
    this.isLoading = true;
    console.log('🚀 Loading face-api models from CDN...');

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN)
      ]);
      
      this.isLoaded = true;
      this.isLoading = false;
      await this.refreshLabeledDescriptors();
      console.log('✅ Face Recognition models and storage loaded');
    } catch (error) {
      this.isLoading = false;
      console.error('❌ Error loading face-api models:', error);
      throw new Error('Failed to load face recognition models. Please check your internet connection.');
    }
  }

  /**
   * Re-loads all face descriptors from storage into the service's memory
   */
  async refreshLabeledDescriptors() {
    try {
      const storedFaces = await faceStorageService.getAllFaces();
      this.labeledDescriptors = storedFaces.map((face: StoredFace) => {
        // Reconstruct Float32Array descriptors from the stored number arrays
        const descriptor = new Float32Array(face.descriptor);
        return new faceapi.LabeledFaceDescriptors(face.name, [descriptor]);
      });
    } catch (error) {
      console.error('Error refreshing descriptors:', error);
    }
  }

  /**
   * Detects a face in the provided video/image and saves its descriptor with a name
   */
  async enrollFace(name: string, source: HTMLVideoElement | HTMLImageElement) {
    if (!this.isLoaded) await this.loadModels();

    // Use TinyFaceDetector for speed on client-side
    const detections = await faceapi
      .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      throw new Error('No face detected. Please position yourself clearly in the frame.');
    }

    if (detections.length > 1) {
      throw new Error('Multiple faces detected. Please ensure only one person is in view.');
    }

    const descriptor = detections[0].descriptor;
    
    // Save to permanent storage
    await faceStorageService.saveFace(name, descriptor);
    
    // Update in-memory descriptors immediately
    await this.refreshLabeledDescriptors();
    
    return true;
  }

  /**
   * Identifies a face in the video stream and returns the recognized name
   */
  async recognizeFace(video: HTMLVideoElement): Promise<string | null> {
    if (!this.isLoaded) {
      await this.loadModels();
    }
    
    if (this.labeledDescriptors.length === 0) return null;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) return null;

      // 0.6 is the standard Euclidean distance threshold for recognition
      const faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.6);
      
      // Match the first detected face
      const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
      
      if (bestMatch.label !== 'unknown') {
        return bestMatch.label;
      }
    } catch (error) {
      console.error('Face recognition error:', error);
    }

    return null;
  }

  /**
   * Returns whether the models are currently loaded
   */
  getIsReady(): boolean {
    return this.isLoaded;
  }
}

export const faceRecognitionService = new FaceRecognitionService();
