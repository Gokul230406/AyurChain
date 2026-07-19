interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: any;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  timeout?: number;
}

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private timeout: NodeJS.Timeout | null = null;
  private config: SpeechConfig;

  constructor(config: SpeechConfig = {}) {
    this.config = {
      language: 'en-US', // Changed to US English for better recognition
      continuous: false,
      interimResults: true, // Enable interim results for better feedback
      maxAlternatives: 3,
      timeout: 10000, // 10 seconds timeout
      ...config
    };

    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    // Try different speech recognition APIs
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognitionSettings();
    }
  }

  private setupRecognitionSettings(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous || false;
    this.recognition.interimResults = this.config.interimResults || true;
    this.recognition.lang = this.config.language || 'en-US';
    this.recognition.maxAlternatives = this.config.maxAlternatives || 3;
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  getAvailableLanguages(): string[] {
    // Common language codes for speech recognition
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'en-IN', // English (India)
      'hi-IN', // Hindi (India)
      'es-ES', // Spanish
      'fr-FR', // French
      'de-DE', // German
      'it-IT', // Italian
      'pt-BR', // Portuguese (Brazil)
      'ru-RU', // Russian
      'ja-JP', // Japanese
      'ko-KR', // Korean
      'zh-CN', // Chinese (Simplified)
    ];
  }

  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  async startListening(): Promise<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isListening) {
      throw new Error('Already listening. Stop current session first.');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      let finalTranscript = '';
      let interimTranscript = '';
      let hasReceivedSpeech = false;

      // Setup timeout
      this.timeout = setTimeout(() => {
        if (this.recognition && this.isListening) {
          this.recognition.stop();
          if (!hasReceivedSpeech) {
            reject(new Error('No speech detected. Please try again.'));
          }
        }
      }, this.config.timeout || 10000);

      this.isListening = true;

      // Handle speech recognition events
      this.recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      this.recognition.onspeechstart = () => {
        hasReceivedSpeech = true;
        console.log('Speech detected');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // If we have a final result, resolve immediately
        if (finalTranscript.trim()) {
          this.cleanup();
          resolve(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionError) => {
        this.cleanup();
        
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly into your microphone.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please try again.';
            break;
          case 'bad-grammar':
            errorMessage = 'Speech recognition grammar error.';
            break;
          case 'language-not-supported':
            errorMessage = `Language "${this.config.language}" not supported.`;
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        this.cleanup();
        
        // If we have some transcript (even interim), use it
        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        } else if (interimTranscript.trim()) {
          resolve(interimTranscript.trim());
        } else if (!hasReceivedSpeech) {
          reject(new Error('No speech was recognized. Please try again.'));
        }
      };

      // Start recognition
      try {
        this.recognition.start();
      } catch (error) {
        this.cleanup();
        reject(new Error('Failed to start speech recognition. Please try again.'));
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isListening = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  // Enhanced method for continuous listening
  async startContinuousListening(
    onInterimResult: (transcript: string) => void,
    onFinalResult: (transcript: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.isListening = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        onInterimResult(interimTranscript);
      }
      
      if (finalTranscript) {
        onFinalResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionError) => {
      onError(`Speech recognition error: ${event.error}`);
      this.cleanup();
    };

    this.recognition.onend = () => {
      this.cleanup();
    };

    this.recognition.start();
  }

  // Method to test microphone access
  async testMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const speechService = new SpeechService({
  language: 'en-US',
  continuous: false,
  interimResults: true,
  maxAlternatives: 3,
  timeout: 15000 // Increased timeout for better user experience
});