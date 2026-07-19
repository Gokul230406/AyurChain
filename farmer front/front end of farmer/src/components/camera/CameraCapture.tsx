import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, RotateCcw } from 'lucide-react';
import { cameraService, CameraCapture as CameraCaptureType } from '@/lib/camera';

interface CameraCaptureProps {
  onCapture: (capture: CameraCaptureType) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    startCamera();
    getCurrentLocation();
    
    return () => {
      cameraService.stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await cameraService.startCamera();
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await cameraService.getCurrentLocation();
      setLocation({ lat: loc.latitude, lng: loc.longitude });
    } catch (err) {
      console.warn('Could not get location:', err);
      // Set default location if GPS fails
      setLocation({ lat: 0, lng: 0 });
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !stream) return;
    
    setIsCapturing(true);
    try {
      const capture = await cameraService.captureWithMetadata(videoRef.current);
      onCapture(capture);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const formatTime = () => {
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={startCamera} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Capture Herb Photo</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{ aspectRatio: '16/9' }}
          />
          
          {/* Overlay with GPS and Time */}
          <div className="absolute top-4 left-4 right-4">
            <Card className="p-3 bg-background/90 backdrop-blur-sm">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Time:</span>
                  <span>{formatTime()}</span>
                </div>
                {location && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">GPS:</span>
                    <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Capture Button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={handleCapture}
              disabled={isCapturing}
              size="lg"
              className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
            >
              <Camera className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};