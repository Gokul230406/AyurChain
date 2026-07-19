export interface CameraCapture {
  photo: string; // base64 encoded
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
}

export class CameraService {
  private stream: MediaStream | null = null;

  async startCamera(): Promise<MediaStream> {
    try {
      // Try rear camera first for mobile with better quality settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          aspectRatio: { ideal: 16/9 }
        }
      });
      return this.stream;
    } catch (error) {
      try {
        // Fallback to any camera with improved constraints
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            aspectRatio: { ideal: 16/9 }
          }
        });
        return this.stream;
      } catch (fallbackError) {
        // Final fallback with minimal constraints
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        return this.stream;
      }
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async capturePhoto(videoElement: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    // Maintain aspect ratio and improve quality
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    let canvasWidth = videoElement.videoWidth;
    let canvasHeight = videoElement.videoHeight;
    
    // Scale down if necessary while maintaining aspect ratio
    if (canvasWidth > maxWidth) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / aspectRatio;
    }
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * aspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Use better scaling
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    context.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight);
    
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async captureWithMetadata(videoElement: HTMLVideoElement): Promise<CameraCapture> {
    const [photo, location] = await Promise.all([
      this.capturePhoto(videoElement),
      this.getCurrentLocation()
    ]);

    return {
      photo,
      location,
      timestamp: new Date().toISOString()
    };
  }
}

export const cameraService = new CameraService();