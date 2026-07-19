import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Mic, Save, MicOff, Volume2, Settings } from 'lucide-react';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { localForageService, HerbRecord } from '@/lib/localforage';
import { speechService } from '@/lib/speech';
import { CameraCapture as CameraCaptureType } from '@/lib/camera';
import { useToast } from '@/hooks/use-toast';
import { submitFarmerRecord } from '@/lib/api';

interface HerbFormProps {
  onSave: (herbName?: string) => void;
}

export const HerbForm = ({ onSave }: HerbFormProps) => {
  const [formData, setFormData] = useState({
    herbName: '',
    quantity: '',
    unit: 'kg',
    quality: 'premium',
    notes: ''
  });
  const [photo, setPhoto] = useState<string>('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCameraCapture = (capture: CameraCaptureType) => {
    setPhoto(capture.photo);
    setLocation(capture.location);
    setShowCamera(false);
    toast({
      title: "Photo captured",
      description: "Herb photo saved successfully"
    });
  };

  const handleVoiceInput = async () => {
    if (!speechService.isSupported()) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice recognition. Try using Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    // Test microphone access first
    const micAccess = await speechService.testMicrophone();
    if (!micAccess) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access and try again.",
        variant: "destructive"
      });
      return;
    }

    // Set language before starting
    speechService.setLanguage(voiceLanguage);

    try {
      setIsListening(true);
      setInterimTranscript('');
      
      toast({
        title: "🎤 Listening...",
        description: "Speak clearly. The recording will stop automatically when you pause.",
      });

      const transcript = await speechService.startListening();
      
      if (transcript.trim()) {
        // Capitalize first letter and clean up the transcript
        const cleanTranscript = transcript.trim()
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        handleInputChange('herbName', cleanTranscript);
        
        toast({
          title: "✅ Voice input captured",
          description: `Added: "${cleanTranscript}"`,
        });
      } else {
        toast({
          title: "No speech detected",
          description: "Please try again and speak more clearly.",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Voice input failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  const handleLanguageChange = (language: string) => {
    setVoiceLanguage(language);
    toast({
      title: "Language updated",
      description: `Voice recognition language set to ${language}`,
    });
  };


  const validateForm = () => {
    if (!formData.herbName.trim()) {
      toast({
        title: "Herb name required",
        description: "Please enter the herb name",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.quantity.trim() || isNaN(Number(formData.quantity))) {
      toast({
        title: "Valid quantity required",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return false;
    }
    if (!photo) {
      toast({
        title: "Photo required",
        description: "Please capture a photo of the herbs",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const submitToBackend = async (record: HerbRecord) => {
    try {
      // Convert record to GeoJSON Feature expected by backend
      const geojson = {
        type: 'Feature',
        properties: {
          id: record.id,
          herbName: record.herbName,
          quantity: record.quantity,
          unit: record.unit,
          quality: record.quality,
          notes: record.notes,
          farmerId: record.farmerId,
          farmerName: record.farmerName,
          timestamp: record.timestamp,
          // Note: large base64 images are not ideal in properties, but included for demo
          photo: record.photo,
        },
        geometry: {
          type: 'Point',
          coordinates: [record.location.longitude, record.location.latitude]
        }
      };

      const result = await submitFarmerRecord(geojson);

      if (result?.success) {
        // mark as synced (best-effort)
        await localForageService.markRecordAsSynced(record.id);
        // store backend identifiers and initial status
        await localForageService.updateRecord(record.id, {
          backendHash: result.hash,
          backendCid: result.cid,
          status: 'pending',
        });
        toast({
          title: "Submitted to backend",
          description: `Hash: ${result.hash?.slice(0, 10)}..., CID: ${result.cid}`,
        });
      } else {
        toast({
          title: "Backend response",
          description: "Submitted, but response did not include success flag",
        });
      }
    } catch (error) {
      console.error("Error submitting to backend:", error);
      toast({
        title: "Submission failed",
        description: "Could not submit to backend",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const record: HerbRecord = {
        id: `herb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        herbName: formData.herbName,
        location: location || { latitude: 0, longitude: 0 },
        timestamp: new Date().toISOString(),
        photo,
        farmerId: 'default_farmer',
        farmerName: 'Herb Collector',
        quantity: Number(formData.quantity),
        unit: formData.unit,
        quality: formData.quality,
        notes: formData.notes,
        synced: false
      };

      await localForageService.saveHerbRecord(record);
      
      // Submit to backend API
      await submitToBackend(record);
      
      // Reset form
      setFormData({
        herbName: '',
        quantity: '',
        unit: 'kg',
        quality: 'premium',
        notes: ''
      });
      setPhoto('');
      setLocation(null);

      toast({
        title: "Record saved",
        description: "Herb record saved offline successfully"
      });

      onSave(formData.herbName);
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save the record",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Record New Harvest</span>
          {!navigator.onLine && (
            <span className="text-xs bg-warning text-warning-foreground px-2 py-1 rounded">
              Offline
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Herb Name with Enhanced Voice Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="herbName">Herb Name</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Voice Settings
            </Button>
          </div>
          
          {/* Voice Language Selection */}
          {showVoiceSettings && (
            <div className="p-3 bg-muted rounded-md space-y-2">
              <Label className="text-sm">Voice Recognition Language</Label>
              <Select value={voiceLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                  <SelectItem value="en-GB">🇬🇧 English (UK)</SelectItem>
                  <SelectItem value="en-IN">🇮🇳 English (India)</SelectItem>
                  <SelectItem value="hi-IN">🇮🇳 Hindi (India)</SelectItem>
                  <SelectItem value="es-ES">🇪🇸 Spanish</SelectItem>
                  <SelectItem value="fr-FR">🇫🇷 French</SelectItem>
                  <SelectItem value="de-DE">🇩🇪 German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              id="herbName"
              value={formData.herbName}
              onChange={(e) => handleInputChange('herbName', e.target.value)}
              placeholder="Enter herb name or use voice input"
              className="flex-1"
            />
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={handleVoiceInput}
              disabled={!speechService.isSupported()}
              className={`min-w-[44px] ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : speechService.isSupported() 
                    ? 'hover:bg-primary hover:text-primary-foreground'
                    : 'opacity-50 cursor-not-allowed'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <div className="flex items-center">
                  <MicOff className="w-4 h-4" />
                </div>
              ) : (
                <div className="flex items-center">
                  <Mic className="w-4 h-4" />
                </div>
              )}
            </Button>
            
            {speechService.isSupported() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(
                      formData.herbName || "No herb name entered"
                    );
                    utterance.lang = voiceLanguage;
                    speechSynthesis.speak(utterance);
                  }
                }}
                disabled={!formData.herbName.trim()}
                title="Listen to current text"
                className="min-w-[44px]"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Voice Input Feedback */}
          {isListening && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">🎤 Listening for speech...</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Speak clearly into your microphone. The recording will stop automatically when you finish speaking.
              </p>
              {interimTranscript && (
                <div className="mt-2 p-2 bg-background rounded text-sm italic">
                  "{interimTranscript}"
                </div>
              )}
            </div>
          )}
          
          {/* Voice Support Status */}
          {!speechService.isSupported() && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Voice input not available.</span>
                <br />Please use Chrome, Edge, or Safari for voice recognition.
              </p>
            </div>
          )}
        </div>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilograms</SelectItem>
                <SelectItem value="grams">Grams</SelectItem>
                <SelectItem value="bundles">Bundles</SelectItem>
                <SelectItem value="pieces">Pieces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <Label htmlFor="quality">Quality Grade</Label>
          <Select value={formData.quality} onValueChange={(value) => handleInputChange('quality', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="organic">Organic Certified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Photo Capture */}
        <div className="space-y-2">
          <Label>Herb Photo</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCamera(true)}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              {photo ? 'Retake Photo' : 'Capture Photo'}
            </Button>
          </div>
          {photo && (
            <div className="mt-2">
              <img src={photo} alt="Captured herb" className="w-full h-48 object-contain bg-gray-50 rounded-md border" style={{ aspectRatio: '16/9' }} />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional information..."
            rows={3}
          />
        </div>

        {/* Location Display */}
        {location && (
          <div className="text-sm text-muted-foreground">
            <strong>Location:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Record'}
        </Button>
      </CardContent>
    </Card>
  );
};