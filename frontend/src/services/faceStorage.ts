import localforage from 'localforage';

// Configure localforage for face storage
const faceStore = localforage.createInstance({
  name: 'DrishtiFaceDB',
  storeName: 'faces'
});

export interface StoredFace {
  name: string;
  descriptor: number[]; // Store as number[] for easy JSON serialization
}

class FaceStorageService {
  /**
   * Saves a face descriptor to IndexedDB
   */
  async saveFace(name: string, descriptor: Float32Array): Promise<void> {
    try {
      const descriptorArray = Array.from(descriptor);
      await faceStore.setItem(name, {
        name,
        descriptor: descriptorArray
      });
      console.log(`Face enrolled for: ${name}`);
    } catch (error) {
      console.error('Error saving face to storage:', error);
      throw new Error('Failed to save face data locally.');
    }
  }

  /**
   * Retrieves all enrolled faces from IndexedDB
   */
  async getAllFaces(): Promise<StoredFace[]> {
    try {
      const faces: StoredFace[] = [];
      await faceStore.iterate((value: StoredFace) => {
        faces.push(value);
      });
      return faces;
    } catch (error) {
      console.error('Error retrieving faces from storage:', error);
      return [];
    }
  }

  /**
   * Deletes a face from storage
   */
  async deleteFace(name: string): Promise<void> {
    try {
      await faceStore.removeItem(name);
    } catch (error) {
      console.error('Error deleting face from storage:', error);
    }
  }

  /**
   * Clears all faces from storage (use with caution)
   */
  async clearAllFaces(): Promise<void> {
    try {
      await faceStore.clear();
    } catch (error) {
      console.error('Error clearing face storage:', error);
    }
  }
}

export const faceStorageService = new FaceStorageService();
