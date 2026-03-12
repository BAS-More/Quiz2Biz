/**
 * Advanced Accessibility System
 *
 * Sprint 38: Internationalization & Accessibility++
 * Task ux38t5: Voice Navigation - Web Speech API, voice commands, speech-to-text
 * Task ux38t6: Advanced Screen Reader - ARIA live regions, custom announcements
 * Task ux38t7: Cognitive Accessibility - Dyslexia-friendly mode, reading mode, focus mode
 *
 * Features:
 * - Voice command recognition and synthesis
 * - Speech-to-text for form inputs
 * - Custom screen reader announcements
 * - ARIA live regions management
 * - Dyslexia-friendly typography
 * - Focus mode (distraction-free)
 * - Reading mode with simplified content
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

// Voice Navigation Types
export interface VoiceCommand {
  command: string;
  aliases: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'form' | 'action' | 'help';
}

export interface VoiceNavigationState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  lastCommand: string | null;
  error: string | null;
}

// Screen Reader Types
export interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: Date;
}

export interface LiveRegionConfig {
  id: string;
  ariaLive: 'polite' | 'assertive' | 'off';
  ariaAtomic: boolean;
  ariaRelevant: string;
}

// Cognitive Accessibility Types
export type FontFamily = 'default' | 'dyslexia' | 'serif' | 'monospace';
export type ReadingLevel = 'normal' | 'simplified' | 'advanced';
export type ContrastMode = 'normal' | 'high' | 'inverted';

export interface CognitiveSettings {
  // Typography
  fontFamily: FontFamily;
  fontSize: number; // percentage (100 = default)
  lineHeight: number; // multiplier (1.5 = default)
  letterSpacing: number; // em units (0 = default)
  wordSpacing: number; // em units (0 = default)

  // Display
  contrastMode: ContrastMode;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  showFocusRing: boolean;

  // Reading
  readingLevel: ReadingLevel;
  readingRuler: boolean;
  highlightLinks: boolean;

  // Focus
  focusMode: boolean;
  hideDecorations: boolean;
  simplifyLayout: boolean;
}

// Combined State
export interface AccessibilityState {
  // Voice
  voice: VoiceNavigationState;
  voiceCommands: VoiceCommand[];
  speechSynthesis: {
    rate: number;
    pitch: number;
    volume: number;
    voice: SpeechSynthesisVoice | null;
  };

  // Screen Reader
  announcements: Announcement[];
  liveRegions: LiveRegionConfig[];

  // Cognitive
  cognitive: CognitiveSettings;

  // General
  isEnabled: boolean;
}

type AccessibilityAction =
  // Voice actions
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; transcript: string; confidence: number }
  | { type: 'SET_LAST_COMMAND'; command: string }
  | { type: 'SET_VOICE_ERROR'; error: string | null }
  | { type: 'SET_VOICE_SUPPORTED'; supported: boolean }
  | { type: 'REGISTER_COMMAND'; command: VoiceCommand }
  | { type: 'UNREGISTER_COMMAND'; command: string }
  | { type: 'SET_SPEECH_SETTINGS'; settings: Partial<AccessibilityState['speechSynthesis']> }

  // Screen Reader actions
  | { type: 'ADD_ANNOUNCEMENT'; announcement: Announcement }
  | { type: 'CLEAR_ANNOUNCEMENTS' }
  | { type: 'ADD_LIVE_REGION'; config: LiveRegionConfig }
  | { type: 'REMOVE_LIVE_REGION'; id: string }

  // Cognitive actions
  | { type: 'UPDATE_COGNITIVE'; settings: Partial<CognitiveSettings> }
  | { type: 'RESET_COGNITIVE' }
  | { type: 'SET_FOCUS_MODE'; enabled: boolean }

  // General actions
  | { type: 'TOGGLE_ACCESSIBILITY'; enabled: boolean }
  | { type: 'LOAD_STATE'; state: Partial<AccessibilityState> };

export interface AccessibilityContextType extends AccessibilityState {
  // Voice Navigation
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, options?: { rate?: number; pitch?: number }) => void;
  cancelSpeech: () => void;
  registerCommand: (command: VoiceCommand) => void;
  unregisterCommand: (command: string) => void;

  // Screen Reader
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceNavigation: (pageName: string) => void;
  announceError: (error: string) => void;
  announceSuccess: (message: string) => void;
  announceProgress: (current: number, total: number, label?: string) => void;

  // Cognitive Accessibility
  updateCognitiveSettings: (settings: Partial<CognitiveSettings>) => void;
  resetCognitiveSettings: () => void;
  toggleFocusMode: () => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setContrastMode: (mode: ContrastMode) => void;

  // General
  toggleAccessibility: (enabled?: boolean) => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultCognitiveSettings: CognitiveSettings = {
  fontFamily: 'default',
  fontSize: 100,
  lineHeight: 1.6,
  letterSpacing: 0,
  wordSpacing: 0,
  contrastMode: 'normal',
  reduceMotion: false,
  reduceTransparency: false,
  showFocusRing: true,
  readingLevel: 'normal',
  readingRuler: false,
  highlightLinks: false,
  focusMode: false,
  hideDecorations: false,
  simplifyLayout: false,
};

const initialVoiceState: VoiceNavigationState = {
  isListening: false,
  isSupported: false,
  transcript: '',
  confidence: 0,
  lastCommand: null,
  error: null,
};

const initialState: AccessibilityState = {
  voice: initialVoiceState,
  voiceCommands: [],
  speechSynthesis: {
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
  },
  announcements: [],
  liveRegions: [],
  cognitive: defaultCognitiveSettings,
  isEnabled: true,
};

// =============================================================================
// STORAGE KEY
// =============================================================================

const STORAGE_KEY = 'quiz2biz_accessibility';

// =============================================================================
// REDUCER
// =============================================================================

function accessibilityReducer(
  state: AccessibilityState,
  action: AccessibilityAction,
): AccessibilityState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, voice: { ...state.voice, isListening: true, error: null } };

    case 'STOP_LISTENING':
      return { ...state, voice: { ...state.voice, isListening: false } };

    case 'SET_TRANSCRIPT':
      return {
        ...state,
        voice: { ...state.voice, transcript: action.transcript, confidence: action.confidence },
      };

    case 'SET_LAST_COMMAND':
      return { ...state, voice: { ...state.voice, lastCommand: action.command } };

    case 'SET_VOICE_ERROR':
      return { ...state, voice: { ...state.voice, error: action.error, isListening: false } };

    case 'SET_VOICE_SUPPORTED':
      return { ...state, voice: { ...state.voice, isSupported: action.supported } };

    case 'REGISTER_COMMAND': {
      const exists = state.voiceCommands.some((c) => c.command === action.command.command);
      if (exists) {
        return state;
      }
      return { ...state, voiceCommands: [...state.voiceCommands, action.command] };
    }

    case 'UNREGISTER_COMMAND':
      return {
        ...state,
        voiceCommands: state.voiceCommands.filter((c) => c.command !== action.command),
      };

    case 'SET_SPEECH_SETTINGS':
      return {
        ...state,
        speechSynthesis: { ...state.speechSynthesis, ...action.settings },
      };

    case 'ADD_ANNOUNCEMENT':
      return {
        ...state,
        announcements: [...state.announcements, action.announcement].slice(-10),
      };

    case 'CLEAR_ANNOUNCEMENTS':
      return { ...state, announcements: [] };

    case 'ADD_LIVE_REGION': {
      const exists = state.liveRegions.some((r) => r.id === action.config.id);
      if (exists) {
        return state;
      }
      return { ...state, liveRegions: [...state.liveRegions, action.config] };
    }

    case 'REMOVE_LIVE_REGION':
      return {
        ...state,
        liveRegions: state.liveRegions.filter((r) => r.id !== action.id),
      };

    case 'UPDATE_COGNITIVE':
      return { ...state, cognitive: { ...state.cognitive, ...action.settings } };

    case 'RESET_COGNITIVE':
      return { ...state, cognitive: defaultCognitiveSettings };

    case 'SET_FOCUS_MODE':
      return {
        ...state,
        cognitive: { ...state.cognitive, focusMode: action.enabled },
      };

    case 'TOGGLE_ACCESSIBILITY':
      return { ...state, isEnabled: action.enabled };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface AccessibilityProviderProps {
  children: ReactNode;
  enableVoice?: boolean;
  defaultCommands?: VoiceCommand[];
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  enableVoice = true,
  defaultCommands = [],
}) => {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const announcerRef = useRef<HTMLDivElement | null>(null);

  // Define speak first so it can be used in other callbacks
  const speak = useCallback(
    (text: string, options?: { rate?: number; pitch?: number }) => {
      if (!synthRef.current) {
        return;
      }

      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? state.speechSynthesis.rate;
      utterance.pitch = options?.pitch ?? state.speechSynthesis.pitch;
      utterance.volume = state.speechSynthesis.volume;

      if (state.speechSynthesis.voice) {
        utterance.voice = state.speechSynthesis.voice;
      }

      synthRef.current.speak(utterance);
    },
    [state.speechSynthesis],
  );

  // Define processVoiceCommand before speech recognition initialization
  const processVoiceCommand = useCallback(
    (transcript: string) => {
      for (const cmd of state.voiceCommands) {
        const allTriggers = [cmd.command.toLowerCase(), ...cmd.aliases.map((a) => a.toLowerCase())];

        for (const trigger of allTriggers) {
          if (transcript.includes(trigger)) {
            cmd.action();
            dispatch({ type: 'SET_LAST_COMMAND', command: cmd.command });
            speak(`Executing: ${cmd.command}`);
            return;
          }
        }
      }

      // No command matched
      speak("I didn't understand that command. Say 'help' for available commands.");
    },
    [state.voiceCommands, speak],
  );

  // Initialize speech recognition
  useEffect(() => {
    if (!enableVoice) {
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript.toLowerCase().trim();
        const confidence = last[0].confidence;

        dispatch({ type: 'SET_TRANSCRIPT', transcript, confidence });

        if (last.isFinal) {
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        dispatch({ type: 'SET_VOICE_ERROR', error: event.error });
      };

      recognition.onend = () => {
        if (state.voice.isListening) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      dispatch({ type: 'SET_VOICE_SUPPORTED', supported: true });
    } else {
      dispatch({ type: 'SET_VOICE_SUPPORTED', supported: false });
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableVoice, processVoiceCommand]);

  // Register default commands
  useEffect(() => {
    defaultCommands.forEach((cmd) => {
      dispatch({ type: 'REGISTER_COMMAND', command: cmd });
    });
  }, [defaultCommands]);

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', state: { cognitive: parsed.cognitive } });
      }
    } catch (error) {
      console.error('[Accessibility] Failed to load saved settings:', error);
    }
  }, []);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          cognitive: state.cognitive,
        }),
      );
    } catch (error) {
      console.error('[Accessibility] Failed to save settings:', error);
    }
  }, [state.cognitive]);

  // Apply cognitive settings to document
  useEffect(() => {
    const { cognitive } = state;

    // Font settings
    document.documentElement.style.setProperty('--a11y-font-size', `${cognitive.fontSize}%`);
    document.documentElement.style.setProperty('--a11y-line-height', String(cognitive.lineHeight));
    document.documentElement.style.setProperty(
      '--a11y-letter-spacing',
      `${cognitive.letterSpacing}em`,
    );
    document.documentElement.style.setProperty('--a11y-word-spacing', `${cognitive.wordSpacing}em`);

    // Font family
    const fontFamilies: Record<FontFamily, string> = {
      default: 'system-ui, -apple-system, sans-serif',
      dyslexia: 'OpenDyslexic, Comic Sans MS, sans-serif',
      serif: 'Georgia, Times New Roman, serif',
      monospace: 'Consolas, Monaco, monospace',
    };
    document.documentElement.style.setProperty(
      '--a11y-font-family',
      fontFamilies[cognitive.fontFamily],
    );

    // Contrast mode
    document.body.classList.remove('contrast-high', 'contrast-inverted');
    if (cognitive.contrastMode === 'high') {
      document.body.classList.add('contrast-high');
    } else if (cognitive.contrastMode === 'inverted') {
      document.body.classList.add('contrast-inverted');
    }

    // Motion
    if (cognitive.reduceMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    // Focus mode
    if (cognitive.focusMode) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }

    // Reading ruler
    if (cognitive.readingRuler) {
      document.body.classList.add('reading-ruler');
    } else {
      document.body.classList.remove('reading-ruler');
    }

    // Highlight links
    if (cognitive.highlightLinks) {
      document.body.classList.add('highlight-links');
    } else {
      document.body.classList.remove('highlight-links');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cognitive]);

  // Voice Navigation functions
  const startListening = useCallback(() => {
    if (recognitionRef.current && state.voice.isSupported) {
      try {
        recognitionRef.current.start();
        dispatch({ type: 'START_LISTENING' });
        speak('Voice navigation activated');
      } catch (error) {
        console.error('[Accessibility] Failed to start recognition:', error);
      }
    }
  }, [state.voice.isSupported, speak]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      dispatch({ type: 'STOP_LISTENING' });
      speak('Voice navigation deactivated');
    }
  }, [speak]);

  const cancelSpeech = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  const registerCommand = useCallback((command: VoiceCommand) => {
    dispatch({ type: 'REGISTER_COMMAND', command });
  }, []);

  const unregisterCommand = useCallback((command: string) => {
    dispatch({ type: 'UNREGISTER_COMMAND', command });
  }, []);

  // Screen Reader functions
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      priority,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_ANNOUNCEMENT', announcement });

    // Also update live region
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const announceNavigation = useCallback(
    (pageName: string) => {
      announce(`Navigated to ${pageName}`, 'polite');
    },
    [announce],
  );

  const announceError = useCallback(
    (error: string) => {
      announce(`Error: ${error}`, 'assertive');
    },
    [announce],
  );

  const announceSuccess = useCallback(
    (message: string) => {
      announce(`Success: ${message}`, 'polite');
    },
    [announce],
  );

  const announceProgress = useCallback(
    (current: number, total: number, label?: string) => {
      const percentage = Math.round((current / total) * 100);
      const message = label
        ? `${label}: ${percentage}% complete, ${current} of ${total}`
        : `Progress: ${percentage}% complete, ${current} of ${total}`;
      announce(message, 'polite');
    },
    [announce],
  );

  // Cognitive Accessibility functions
  const updateCognitiveSettings = useCallback((settings: Partial<CognitiveSettings>) => {
    dispatch({ type: 'UPDATE_COGNITIVE', settings });
  }, []);

  const resetCognitiveSettings = useCallback(() => {
    dispatch({ type: 'RESET_COGNITIVE' });
  }, []);

  const toggleFocusMode = useCallback(() => {
    dispatch({ type: 'SET_FOCUS_MODE', enabled: !state.cognitive.focusMode });
  }, [state.cognitive.focusMode]);

  const setFontFamily = useCallback((font: FontFamily) => {
    dispatch({ type: 'UPDATE_COGNITIVE', settings: { fontFamily: font } });
  }, []);

  const setFontSize = useCallback((size: number) => {
    dispatch({ type: 'UPDATE_COGNITIVE', settings: { fontSize: size } });
  }, []);

  const setContrastMode = useCallback((mode: ContrastMode) => {
    dispatch({ type: 'UPDATE_COGNITIVE', settings: { contrastMode: mode } });
  }, []);

  // General functions
  const toggleAccessibility = useCallback(
    (enabled?: boolean) => {
      dispatch({ type: 'TOGGLE_ACCESSIBILITY', enabled: enabled ?? !state.isEnabled });
    },
    [state.isEnabled],
  );

  const contextValue: AccessibilityContextType = {
    ...state,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    registerCommand,
    unregisterCommand,
    announce,
    announceNavigation,
    announceError,
    announceSuccess,
    announceProgress,
    updateCognitiveSettings,
    resetCognitiveSettings,
    toggleFocusMode,
    setFontFamily,
    setFontSize,
    setContrastMode,
    toggleAccessibility,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Screen reader announcer (visually hidden) */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const styles = {
  panel: 'bg-surface-50 rounded-xl shadow-card p-6',
  title: 'text-lg font-semibold text-surface-900 mb-5 flex items-center gap-2',
  section: 'mb-6',
  sectionTitle: 'text-sm font-semibold text-surface-500 mb-3 uppercase tracking-wide',
  option: 'flex justify-between items-center py-3 border-b border-surface-200',
  optionLabel: 'text-sm text-surface-700',
  slider: 'w-[120px] h-1.5 rounded-full appearance-none bg-surface-200 cursor-pointer',
  select: 'px-3 py-2 rounded-lg border border-surface-300 text-sm bg-surface-50 cursor-pointer',
  toggle: 'w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 relative border-none',
  toggleKnob: 'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-[left] duration-200 shadow-sm',
  voiceButton: 'flex items-center gap-2 px-6 py-3 rounded-lg border-none text-sm font-medium cursor-pointer transition-all duration-200',
  commandList: 'max-h-[200px] overflow-auto py-2',
  commandItem: 'flex justify-between px-3 py-2 bg-surface-100 rounded-md mb-1 text-[13px]',
};

// Toggle Component
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <div className={styles.option}>
    <span className={styles.optionLabel}>{label}</span>
    <button
      className={`${styles.toggle} ${checked ? 'bg-brand-500' : 'bg-surface-300'}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div
        className={styles.toggleKnob}
        style={{ left: checked ? '22px' : '2px' }}
      />
    </button>
  </div>
);

// Accessibility Settings Panel
export const AccessibilitySettingsPanel: React.FC = () => {
  const {
    cognitive,
    voice,
    updateCognitiveSettings,
    resetCognitiveSettings,
    startListening,
    stopListening,
    voiceCommands,
  } = useAccessibility();

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        <span>♿</span>
        Accessibility Settings
      </h2>

      {/* Voice Navigation */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Voice Navigation</h3>

        {voice.isSupported ? (
          <>
            <button
              className={`${styles.voiceButton} ${voice.isListening ? 'bg-danger-500' : 'bg-brand-500'} text-white`}
              onClick={voice.isListening ? stopListening : startListening}
            >
              <span>{voice.isListening ? '🔴' : '🎤'}</span>
              {voice.isListening ? 'Stop Listening' : 'Start Voice Control'}
            </button>

            {voice.isListening && voice.transcript && (
              <p className="mt-3 text-sm text-surface-500">
                Heard: "{voice.transcript}"
              </p>
            )}

            <div className="mt-4">
              <p className="text-[13px] text-surface-500 mb-2">
                Available Commands:
              </p>
              <div className={styles.commandList}>
                {voiceCommands.map((cmd) => (
                  <div key={cmd.command} className={styles.commandItem}>
                    <span>"{cmd.command}"</span>
                    <span className="text-surface-500">{cmd.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-danger-500 text-sm">
            Voice navigation is not supported in your browser.
          </p>
        )}
      </div>

      {/* Typography */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Typography</h3>

        <div className={styles.option}>
          <span className={styles.optionLabel}>Font Family</span>
          <select
            className={styles.select}
            value={cognitive.fontFamily}
            onChange={(e) => updateCognitiveSettings({ fontFamily: e.target.value as FontFamily })}
          >
            <option value="default">Default</option>
            <option value="dyslexia">Dyslexia-Friendly</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
          </select>
        </div>

        <div className={styles.option}>
          <span className={styles.optionLabel}>Font Size ({cognitive.fontSize}%)</span>
          <input
            type="range"
            min="75"
            max="200"
            value={cognitive.fontSize}
            onChange={(e) => updateCognitiveSettings({ fontSize: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>

        <div className={styles.option}>
          <span className={styles.optionLabel}>Line Height ({cognitive.lineHeight.toFixed(1)})</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={cognitive.lineHeight}
            onChange={(e) => updateCognitiveSettings({ lineHeight: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>

        <div className={styles.option}>
          <span className={styles.optionLabel}>
            Letter Spacing ({cognitive.letterSpacing.toFixed(2)}em)
          </span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={cognitive.letterSpacing}
            onChange={(e) => updateCognitiveSettings({ letterSpacing: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>
      </div>

      {/* Display */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Display</h3>

        <div className={styles.option}>
          <span className={styles.optionLabel}>Contrast Mode</span>
          <select
            className={styles.select}
            value={cognitive.contrastMode}
            onChange={(e) =>
              updateCognitiveSettings({ contrastMode: e.target.value as ContrastMode })
            }
          >
            <option value="normal">Normal</option>
            <option value="high">High Contrast</option>
            <option value="inverted">Inverted</option>
          </select>
        </div>

        <Toggle
          label="Reduce Motion"
          checked={cognitive.reduceMotion}
          onChange={(v) => updateCognitiveSettings({ reduceMotion: v })}
        />

        <Toggle
          label="Reduce Transparency"
          checked={cognitive.reduceTransparency}
          onChange={(v) => updateCognitiveSettings({ reduceTransparency: v })}
        />

        <Toggle
          label="Enhanced Focus Ring"
          checked={cognitive.showFocusRing}
          onChange={(v) => updateCognitiveSettings({ showFocusRing: v })}
        />
      </div>

      {/* Reading Aids */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Reading Aids</h3>

        <Toggle
          label="Reading Ruler"
          checked={cognitive.readingRuler}
          onChange={(v) => updateCognitiveSettings({ readingRuler: v })}
        />

        <Toggle
          label="Highlight Links"
          checked={cognitive.highlightLinks}
          onChange={(v) => updateCognitiveSettings({ highlightLinks: v })}
        />

        <Toggle
          label="Focus Mode"
          checked={cognitive.focusMode}
          onChange={(v) => updateCognitiveSettings({ focusMode: v })}
        />

        <Toggle
          label="Hide Decorations"
          checked={cognitive.hideDecorations}
          onChange={(v) => updateCognitiveSettings({ hideDecorations: v })}
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={resetCognitiveSettings}
        className="w-full px-6 py-3 bg-surface-100 text-surface-700 border-none rounded-lg text-sm cursor-pointer"
      >
        Reset to Defaults
      </button>
    </div>
  );
};

// Voice Navigation Button (Floating)
export const VoiceNavigationButton: React.FC = () => {
  const { voice, startListening, stopListening } = useAccessibility();

  if (!voice.isSupported) {
    return null;
  }

  return (
    <button
      className={`fixed bottom-20 right-6 w-14 h-14 rounded-full text-white border-none shadow-lg cursor-pointer flex items-center justify-center text-2xl z-[999] transition-all duration-200 ${voice.isListening ? 'bg-danger-500' : 'bg-brand-500'}`}
      onClick={voice.isListening ? stopListening : startListening}
      aria-label={voice.isListening ? 'Stop voice navigation' : 'Start voice navigation'}
    >
      {voice.isListening ? '🔴' : '🎤'}
    </button>
  );
};

// Skip Link Component
export interface SkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children = 'Skip to main content',
}) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-1 focus:w-auto focus:h-auto focus:px-6 focus:py-3 focus:bg-brand-500 focus:text-white focus:rounded-lg focus:z-[10000] focus:text-base focus:font-semibold focus:no-underline"
  >
    {children}
  </a>
);

// Live Region Component
export interface LiveRegionProps {
  id: string;
  children: ReactNode;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaAtomic?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  id,
  children,
  ariaLive = 'polite',
  ariaAtomic = true,
}) => (
  <div id={id} role="status" aria-live={ariaLive} aria-atomic={ariaAtomic}>
    {children}
  </div>
);

// Focus Trap Component
export interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
};
