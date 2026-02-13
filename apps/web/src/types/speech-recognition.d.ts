/**
 * Web Speech API type declarations
 * Extends the standard types for cross-browser support
 */

// Custom event types for speech recognition
interface CustomSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface CustomSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

// Extend the Window interface for webkit prefix support
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export type { CustomSpeechRecognitionErrorEvent, CustomSpeechRecognitionEvent };
