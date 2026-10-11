'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { appendSpeechText } from '../lib/evaluation/scoring';

// Web Speech API interface definitions for TypeScript compatibility
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type MicState = 'idle' | 'requesting' | 'listening' | 'muted' | 'processing' | 'error' | 'unsupported';
export type CameraState = 'off' | 'requesting' | 'active' | 'denied' | 'unavailable';

export interface UseVoiceInterviewOptions {
  onFinalTranscript?: (text: string) => void;
  lang?: string;
}

export interface UseVoiceInterviewReturn {
  // Voice Input (Speech-to-Text & Microphone Controls)
  micState: MicState;
  micError: string | null;
  isListening: boolean;
  isMuted: boolean;
  transcript: string;
  interimTranscript: string;
  isSpeechRecognitionSupported: boolean;
  startSpeaking: () => Promise<void>;
  stopSpeaking: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  toggleMute: () => void;
  mute: () => void;
  unmute: () => Promise<void>;
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

export function useVoiceInterview(options: UseVoiceInterviewOptions = {}): UseVoiceInterviewReturn {
  const { onFinalTranscript, lang = 'en-US' } = options;

  // Keep callback reference updated without triggering re-renders
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  // Check browser capabilities cleanly
  const checkSpeechRecognition = (): boolean => {
    if (typeof window === 'undefined') return true;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  };

  const checkSpeechSynthesis = (): boolean => {
    if (typeof window === 'undefined') return true;
    return typeof window.speechSynthesis !== 'undefined';
  };

  // --- Speech Recognition (Microphone) State ---
  const [isSpeechRecognitionSupported] = useState<boolean>(checkSpeechRecognition);
  const [micState, setMicState] = useState<MicState>(() => (checkSpeechRecognition() ? 'idle' : 'unsupported'));
  const [micError, setMicError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Synchronous State References to prevent stale closure bugs in event callbacks
  const recognitionRef = useRef<any>(null);
  const isMutedRef = useRef<boolean>(false);
  const isManuallyStoppedRef = useRef<boolean>(true);
  const isSpeakingQuestionRef = useRef<boolean>(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const startRecognitionRef = useRef<() => void>(() => {});

  // --- Speech Synthesis (AI Voice Narration) State ---
  const [isSpeechSynthesisSupported] = useState<boolean>(checkSpeechSynthesis);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);

  // --- Local Camera Video State ---
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Keep synchronous refs in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakingQuestionRef.current = isSpeakingQuestion;
  }, [isSpeakingQuestion]);

  /**
   * Request microphone hardware access via MediaDevices getUserMedia.
   * Ensures browser permissions are explicitly prompted and an active audio track is acquired.
   */
  const requestMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // In insecure non-localhost contexts, getUserMedia is blocked by modern browsers
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setMicState('error');
        setMicError('Microphone capture requires HTTPS or localhost (http://localhost:3000). Please open via localhost.');
        return false;
      }
      return true; // Fall back directly to Web Speech API
    }

    try {
      if (!audioStreamRef.current || !audioStreamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;
      }
      return true;
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setMicState('error');
        setMicError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
        isManuallyStoppedRef.current = true;
        return false;
      } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
        setMicState('error');
        setMicError('No microphone hardware detected. Please connect a microphone or type in the scratchpad.');
        isManuallyStoppedRef.current = true;
        return false;
      }
      console.warn('[getUserMedia Audio Notice]:', err);
      return true; // Attempt SpeechRecognition regardless
    }
  }, []);

  /**
   * Internal helper to create and start a fresh SpeechRecognition instance.
   */
  const initAndStartRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicState('unsupported');
      setMicError('Speech recognition (Web Speech API) is not supported in this browser. Please use Chrome, Edge, or Safari, or type in the scratchpad.');
      return;
    }

    // Prevent re-entrance
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    // Clean up previous instance cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isInitializingRef.current = false;
        if (isMutedRef.current) {
          setMicState('muted');
        } else {
          setMicState('listening');
          setMicError(null);
        }
      };

      recognition.onresult = (event: any) => {
        // If muted or AI is narrating, discard incoming audio chunks to prevent echo
        if (isMutedRef.current || isSpeakingQuestionRef.current) {
          return;
        }

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

        if (newFinalText.trim()) {
          const chunk = newFinalText.trim();
          setTranscript(prev => appendSpeechText(prev, chunk));
          if (onFinalTranscriptRef.current) {
            onFinalTranscriptRef.current(chunk);
          }
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        isInitializingRef.current = false;
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setMicState('error');
          setMicError('Microphone permission was denied. Please allow microphone access in your browser.');
          isManuallyStoppedRef.current = true;
        } else if (event.error === 'no-speech') {
          // Normal timeout on quiet audio; stay in listening if candidate is still speaking
          if (!isManuallyStoppedRef.current && !isMutedRef.current && !isSpeakingQuestionRef.current) {
            setMicState('listening');
          }
        } else if (event.error === 'audio-capture') {
          setMicState('error');
          setMicError('No microphone hardware detected. Please connect a microphone or use keyboard input.');
          isManuallyStoppedRef.current = true;
        } else if (event.error === 'aborted') {
          // Expected on intentional stop, mute, or during AI narration
          if (isMutedRef.current) {
            setMicState('muted');
          } else if (isManuallyStoppedRef.current) {
            setMicState('idle');
          }
        } else {
          setMicState('error');
          setMicError(`Voice capture error (${event.error}). Click microphone to retry.`);
        }
      };

      recognition.onend = () => {
        isInitializingRef.current = false;
        setInterimTranscript('');

        // If user muted the mic, stay in muted state
        if (isMutedRef.current) {
          setMicState('muted');
          return;
        }

        // If manually stopped by user, return to idle
        if (isManuallyStoppedRef.current) {
          setMicState('idle');
          return;
        }

        // If AI is narrating the question, remain paused until AI stops
        if (isSpeakingQuestionRef.current) {
          setMicState('idle');
          return;
        }

        // Continuous recognition restart: Chrome and WebKit stop after ~30-60s or pauses
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }
        restartTimerRef.current = setTimeout(() => {
          if (!isManuallyStoppedRef.current && !isMutedRef.current && !isSpeakingQuestionRef.current) {
            startRecognitionRef.current();
          }
        }, 150);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      isInitializingRef.current = false;
      const msg = err instanceof Error ? err.message : 'Failed to initialize microphone.';
      setMicState('error');
      setMicError(msg);
    }
  }, [lang]);

  useEffect(() => {
    startRecognitionRef.current = initAndStartRecognition;
  }, [initAndStartRecognition]);

  // --- Start Speaking (Microphone Active) ---
  const startSpeaking = useCallback(async () => {
    isManuallyStoppedRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);
    setMicError(null);
    setMicState('requesting');

    // Interrupt AI voice playback immediately if candidate begins speaking
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
      isSpeakingQuestionRef.current = false;
    }

    // 1. Verify/request hardware microphone access
    const hasAccess = await requestMicrophoneAccess();
    if (hasAccess === false) return;

    // 2. Enable hardware audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = true;
      });
    }

    // 3. Start speech recognition engine
    initAndStartRecognition();
  }, [requestMicrophoneAccess, initAndStartRecognition]);

  // --- Stop Speaking (Microphone Inactive) ---
  const stopSpeaking = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setInterimTranscript('');
    setMicState('idle');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // --- Pause Listening (Temporary, preserves user listening mode across AI turns) ---
  const pauseListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, []);

  // --- Resume Listening (Restores listening if not manually stopped or muted) ---
  const resumeListening = useCallback(() => {
    isManuallyStoppedRef.current = false;
    if (!isMutedRef.current && !isSpeakingQuestionRef.current) {
      initAndStartRecognition();
    }
  }, [initAndStartRecognition]);

  // --- Mute Microphone ---
  const mute = useCallback(() => {
    isMutedRef.current = true;
    setIsMuted(true);
    setInterimTranscript('');
    setMicState('muted');

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Disable hardware audio tracks to guarantee privacy
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = false;
      });
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, []);

  // --- Unmute Microphone ---
  const unmute = useCallback(async () => {
    isMutedRef.current = false;
    setIsMuted(false);
    isManuallyStoppedRef.current = false;
    setMicError(null);

    // Re-enable hardware audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = true;
      });
    } else {
      await requestMicrophoneAccess();
    }

    initAndStartRecognition();
  }, [requestMicrophoneAccess, initAndStartRecognition]);

  // --- Toggle Mute / Unmute / Start ---
  const toggleMute = useCallback(() => {
    if (isMutedRef.current || micState === 'muted') {
      unmute();
    } else if (micState === 'listening') {
      mute();
    } else {
      // If mic is idle or in error, clicking the mic control activates it
      startSpeaking();
    }
  }, [mute, unmute, startSpeaking, micState]);

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
    isSpeakingQuestionRef.current = false;

    // Resume listening if candidate was actively speaking and unmuted
    if (!isManuallyStoppedRef.current && !isMutedRef.current) {
      setTimeout(() => {
        if (!isSpeakingQuestionRef.current && !isMutedRef.current && !isManuallyStoppedRef.current) {
          initAndStartRecognition();
        }
      }, 150);
    }
  }, [initAndStartRecognition]);

  const playQuestionAudio = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    // Cancel any currently active speech synthesis
    window.speechSynthesis.cancel();

    if (!text || !text.trim()) {
      setIsSpeakingQuestion(false);
      isSpeakingQuestionRef.current = false;
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
      isSpeakingQuestionRef.current = true;
      // Pause speech recognition temporarily so the system voice is not transcribed
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };

    utterance.onend = () => {
      setIsSpeakingQuestion(false);
      isSpeakingQuestionRef.current = false;
      // Resume listening for candidate response if not muted or manually stopped
      if (!isManuallyStoppedRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (!isSpeakingQuestionRef.current && !isMutedRef.current && !isManuallyStoppedRef.current) {
            initAndStartRecognition();
          }
        }, 200);
      }
    };

    utterance.onerror = () => {
      setIsSpeakingQuestion(false);
      isSpeakingQuestionRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, [initAndStartRecognition]);

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
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false // Voice audio handled via dedicated mic stream
      });

      cameraStreamRef.current = stream;
      setCameraState('active');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Camera permission was denied. You can continue the interview via voice and text.');
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setCameraState('unavailable');
        setCameraError('No webcam was detected on this device.');
      } else {
        setCameraState('unavailable');
        setCameraError('Unable to access webcam. Continuing in audio/text mode.');
      }
    }
  }, []);

  const disableCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      cameraStreamRef.current = null;
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
    if (cameraState === 'active' && cameraStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraState]);

  // --- Comprehensive Cleanup ---
  const cleanupMedia = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // 1. Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        isManuallyStoppedRef.current = true;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    // 2. Stop Microphone Audio Tracks
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      audioStreamRef.current = null;
    }

    // 3. Cancel Speech Synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // 4. Stop all Camera Tracks
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      cameraStreamRef.current = null;
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
    isMuted,
    transcript,
    interimTranscript,
    isSpeechRecognitionSupported,
    startSpeaking,
    stopSpeaking,
    pauseListening,
    resumeListening,
    toggleMute,
    mute,
    unmute,
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
