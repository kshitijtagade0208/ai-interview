'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface definitions for TypeScript compatibility
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type MicState = 'idle' | 'requesting' | 'listening' | 'processing' | 'error' | 'unsupported';
export type CameraState = 'off' | 'requesting' | 'active' | 'denied' | 'unavailable';

export interface UseVoiceInterviewReturn {
  // Voice Input (Speech-to-Text)
  micState: MicState;
  micError: string | null;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSpeechRecognitionSupported: boolean;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  setTranscript: (text: string | ((prev: string) => string)) => void;
  clearTranscript: () => void;

  // Question Narration (Text-to-Speech)
  isSpeechSynthesisSupported: boolean;
  isSpeakingQuestion: boolean;
  playQuestionAudio: (text: string) => void;
  stopQuestionAudio: () => void;

  // Local Camera Preview
  cameraState: CameraState;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enableCamera: () => Promise<void>;
  disableCamera: () => void;
  toggleCamera: () => Promise<void>;

  // Cleanup
  cleanupMedia: () => void;
}

export function useVoiceInterview(): UseVoiceInterviewReturn {
  // --- Speech Recognition (Microphone) State ---
  const [micState, setMicState] = useState<MicState>('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  // --- Speech Synthesis (AI Voice Narration) State ---
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState<boolean>(true);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);

  // --- Local Camera Video State ---
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const hasSpeechRecognition = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
      setIsSpeechRecognitionSupported(hasSpeechRecognition);
      if (!hasSpeechRecognition) {
        setMicState('unsupported');
      }

      const hasSpeechSynthesis = typeof window.speechSynthesis !== 'undefined';
      setIsSpeechSynthesisSupported(hasSpeechSynthesis);
    }
  }, []);

  // --- Initialize & Manage Speech Recognition ---
  const startSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicState('unsupported');
      setMicError('Speech recognition is not supported in this browser. Please type your answer.');
      return;
    }

    try {
      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      isManuallyStoppedRef.current = false;
      setMicState('requesting');
      setMicError(null);

      recognition.onstart = () => {
        setMicState('listening');
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let newFinalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            newFinalText += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (newFinalText) {
          setTranscript(prev => {
            const trimmed = prev.trim();
            const addition = newFinalText.trim();
            return trimmed ? `${trimmed} ${addition}` : addition;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        // Handle common Web Speech error codes
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setMicState('error');
          setMicError('Microphone permission was denied. Please allow microphone access in your browser or type your answer.');
        } else if (event.error === 'no-speech') {
          // Normal timeout when quiet; remain in listening or transition to idle if stopped
          if (!isManuallyStoppedRef.current) {
            setMicState('listening');
          }
        } else if (event.error === 'audio-capture') {
          setMicState('error');
          setMicError('No microphone detected. Please connect a microphone or use keyboard input.');
        } else {
          setMicState('error');
          setMicError(`Voice capture error (${event.error}). You can continue typing manually.`);
        }
      };

      recognition.onend = () => {
        setInterimTranscript('');
        if (!isManuallyStoppedRef.current && micState === 'listening') {
          // Attempt automatic graceful restart for continuous flow unless manually stopped
          try {
            recognition.start();
            return;
          } catch {
            setMicState('idle');
          }
        } else {
          setMicState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setMicState('error');
      setMicError(err?.message || 'Failed to initialize microphone.');
    }
  }, [micState]);

  const stopSpeaking = useCallback(() => {
    isManuallyStoppedRef.current = true;
    setMicState('processing');
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    }
    setTimeout(() => {
      setMicState('idle');
    }, 400);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // --- Speech Synthesis (Question Audio Narration) ---
  const stopQuestionAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
  }, []);

  const playQuestionAudio = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    // Cancel any current speaking
    window.speechSynthesis.cancel();

    if (!text || !text.trim()) {
      setIsSpeakingQuestion(false);
      return;
    }

    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/```[\s\S]*?```/g, 'Code snippet provided in description.')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel')))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsSpeakingQuestion(true);
    };

    utterance.onend = () => {
      setIsSpeakingQuestion(false);
    };

    utterance.onerror = () => {
      setIsSpeakingQuestion(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // --- Local Camera Video Preview ---
  const enableCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setCameraError('Camera API is not supported on this browser or environment.');
      return;
    }

    try {
      setCameraState('requesting');
      setCameraError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false // audio handled separately by Web Speech recognition
      });

      streamRef.current = stream;
      setCameraState('active');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Camera permission was denied. You can continue the interview without video.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraState('unavailable');
        setCameraError('No webcam was detected on this device.');
      } else {
        setCameraState('unavailable');
        setCameraError('Unable to access webcam. Continuing in audio/text mode.');
      }
    }
  }, []);

  const disableCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('off');
    setCameraError(null);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraState === 'active') {
      disableCamera();
    } else {
      await enableCamera();
    }
  }, [cameraState, enableCamera, disableCamera]);

  // Re-attach video stream if component re-rendered or videoRef becomes available while active
  useEffect(() => {
    if (cameraState === 'active' && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraState]);

  // --- Comprehensive Cleanup ---
  const cleanupMedia = useCallback(() => {
    // 1. Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        isManuallyStoppedRef.current = true;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    // 2. Cancel Speech Synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // 3. Stop all Camera Tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Ensure all media streams and audio synthesis are released on unmount
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    micState,
    micError,
    isListening: micState === 'listening',
    transcript,
    interimTranscript,
    isSpeechRecognitionSupported,
    startSpeaking,
    stopSpeaking,
    setTranscript,
    clearTranscript,

    isSpeechSynthesisSupported,
    isSpeakingQuestion,
    playQuestionAudio,
    stopQuestionAudio,

    cameraState,
    cameraError,
    videoRef,
    enableCamera,
    disableCamera,
    toggleCamera,

    cleanupMedia
  };
}
