'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Sparkles,
  Clock,
  ShieldCheck,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  MessageSquare,
  Code2,
  FileText,
  Bot,
  User,
  Cpu,
  AlertCircle,
  Square,
  RotateCcw
} from 'lucide-react';
import { QuestionData, InterviewConfig } from '../types/interview';
import {
  MOCK_INTERVIEW_QUESTIONS,
  generateDynamicFallbackQuestions
} from '../data/mockData';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { composeFinalAnswer, appendSpeechText, getUncommittedInterim } from '../lib/evaluation/scoring';

interface LiveInterviewProps {
  config: InterviewConfig;
  onEndInterview: () => void;
  currentQuestionData?: QuestionData;
  questionIndex?: number;
  totalQuestionsCount?: number;
  onSubmitAnswer?: (answer: string, notes?: string) => void;
  onAdvanceQuestion?: () => void;
  onPreviousQuestion?: () => void;
}

export const LiveInterview: React.FC<LiveInterviewProps> = ({
  config,
  onEndInterview,
  currentQuestionData,
  questionIndex,
  totalQuestionsCount,
  onSubmitAnswer,
  onAdvanceQuestion,
  onPreviousQuestion
}) => {
  const [internalQuestionIndex, setInternalQuestionIndex] = useState(0);
  const activeQuestionIndex = questionIndex !== undefined ? questionIndex : internalQuestionIndex;
  const totalQuestions = totalQuestionsCount || MOCK_INTERVIEW_QUESTIONS.length;

  const [isCaptionsOn, setIsCaptionsOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'question' | 'scratchpad' | 'hints'>('question');
  
  // Independent answer/scratchpad storage per question index
  const [scratchpads, setScratchpads] = useState<Record<number, string>>({});
  const currentScratchpad = scratchpads[activeQuestionIndex] ?? '';

  const [showEndModal, setShowEndModal] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isAutoAdvancingRef = useRef(false);
  const [latestInterviewerSpokenTurn, setLatestInterviewerSpokenTurn] = useState<string | null>(null);
  const [isFinishingTurn, setIsFinishingTurn] = useState(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenInCurrentTurnRef = useRef<boolean>(false);

  // Sync state refs to prevent stale closure bugs in asynchronous timeouts
  const currentScratchpadRef = useRef(currentScratchpad);
  useEffect(() => {
    currentScratchpadRef.current = currentScratchpad;
  }, [currentScratchpad]);

  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const isListeningRef = useRef(false);
  const isSpeakingQuestionRef = useRef(false);

  // Real-time speech-to-text chunk handler appending speech directly into active scratchpad
  const handleFinalTranscript = useCallback((chunk: string) => {
    if (!chunk || !chunk.trim()) return;
    const textToAppend = chunk.trim();
    hasSpokenInCurrentTurnRef.current = true;
    setScratchpads(prev => {
      const existing = (prev[activeQuestionIndex] || '').trim();
      const updated = appendSpeechText(existing, textToAppend);
      return {
        ...prev,
        [activeQuestionIndex]: updated
      };
    });
  }, [activeQuestionIndex]);

  // Hook for Web Speech STT, TTS, and local Camera stream
  const {
    micState,
    micError,
    isListening,
    isMuted,
    transcript,
    interimTranscript,
    startSpeaking,
    stopSpeaking,
    pauseListening,
    resumeListening,
    mute,
    unmute,
    clearTranscript,

    isSpeakingQuestion,
    playQuestionAudio,
    stopQuestionAudio,

    cameraState,
    videoRef,
    enableCamera,
    toggleCamera,

    cleanupMedia
  } = useVoiceInterview({
    onFinalTranscript: handleFinalTranscript
  });

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingQuestionRef.current = isSpeakingQuestion;
  }, [isSpeakingQuestion]);

  const displayInterim = getUncommittedInterim(currentScratchpad, interimTranscript);

  // LiveKit Real-time WebRTC Room Connection
  const safeRoleSlug = (config.targetRole || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const {
    isConnected: isLiveKitConnected,
    isConnecting: isLiveKitConnecting,
    isAgentSpeaking: isLiveKitAgentSpeaking,
    participantCount: livekitParticipants,
    setMicrophoneEnabled: setLiveKitMicEnabled,
    connectToRoom: reconnectLiveKit
  } = useLiveKitRoom({
    roomName: `skillbridge-${safeRoleSlug}`,
    candidateName: 'Candidate',
    autoConnect: true,
  });

  // Dynamic AI state indicator
  const isAgentSpeaking = isSpeakingQuestion || isLiveKitAgentSpeaking;

  // Timer countdown
  const [secondsRemaining, setSecondsRemaining] = useState(config.duration * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize mute/unmute action across both Web Speech API and LiveKit audio track
  const handleToggleMute = useCallback(() => {
    if (isMuted || micState === 'muted') {
      unmute();
      if (setLiveKitMicEnabled) {
        setLiveKitMicEnabled(true);
      }
    } else if (isListening) {
      mute();
      if (setLiveKitMicEnabled) {
        setLiveKitMicEnabled(false);
      }
    } else {
      startSpeaking();
      if (setLiveKitMicEnabled) {
        setLiveKitMicEnabled(true);
      }
    }
  }, [isMuted, micState, isListening, mute, unmute, startSpeaking, setLiveKitMicEnabled]);

  // Stop active speech and audio ONLY when question actually changes
  const prevQuestionIndexRef = useRef(activeQuestionIndex);
  useEffect(() => {
    if (prevQuestionIndexRef.current !== activeQuestionIndex) {
      prevQuestionIndexRef.current = activeQuestionIndex;
      if (!isAutoAdvancingRef.current) {
        stopQuestionAudio();
      }
      isAutoAdvancingRef.current = false;
      clearTranscript();
      setValidationWarning(null);
    }
  }, [activeQuestionIndex, stopQuestionAudio, clearTranscript]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const dynamicFallbackQuestions = generateDynamicFallbackQuestions(
    config.targetRole,
    config.selectedSkills,
    config.difficulty,
    config.jobDescription
  );

  const currentQuestion: QuestionData =
    currentQuestionData ||
    dynamicFallbackQuestions[activeQuestionIndex] ||
    dynamicFallbackQuestions[0] ||
    MOCK_INTERVIEW_QUESTIONS[activeQuestionIndex] ||
    MOCK_INTERVIEW_QUESTIONS[0];

  // Derived active interviewer spoken turn (prefers latest turn from evaluation, falls back to question metadata)
  const activeInterviewerSpokenTurn = latestInterviewerSpokenTurn || currentQuestion?.conversationalResponse || null;

  const handleNextQuestion = useCallback(async () => {
    if (isSubmittingRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsFinishingTurn(false);

    // Compose final candidate answer across typed scratchpad, final transcript, and interim speech
    const candidateAnswer = composeFinalAnswer(
      currentScratchpadRef.current,
      transcriptRef.current,
      interimTranscriptRef.current
    );

    const wasListening = isListeningRef.current && !isMuted;

    // Stop active audio narration and pause speech capture to avoid transcribing background noise
    stopQuestionAudio();
    if (wasListening) {
      pauseListening();
    }
    clearTranscript();

    // Guard against submitting an empty answer if in voice mode without any spoken content
    if (!candidateAnswer.trim() && wasListening) {
      setValidationWarning('Please speak or type your answer before submitting.');
      resumeListening();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setValidationWarning(null);
    hasSpokenInCurrentTurnRef.current = false;

    // Update scratchpad for current question with the final composed answer
    setScratchpads(prev => ({
      ...prev,
      [activeQuestionIndex]: candidateAnswer
    }));

    // Submit answer through existing evaluation pipeline
    let evaluationResult: any = null;
    try {
      if (onSubmitAnswer) {
        const effectiveResponse = candidateAnswer || 'Candidate presented verbal response.';
        evaluationResult = await onSubmitAnswer(effectiveResponse, candidateAnswer || undefined);
      }
    } catch (err) {
      console.error('[LiveInterview] Error evaluating answer:', err);
    }

    if (activeQuestionIndex < totalQuestions - 1) {
      isAutoAdvancingRef.current = true;
      if (onAdvanceQuestion) {
        onAdvanceQuestion();
      } else {
        setInternalQuestionIndex(prev => prev + 1);
      }
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      // Conversational Voice: Dr. Maya speaks her personalized follow-up turn aloud
      const spokenTurn = evaluationResult?.conversationalResponse;
      if (spokenTurn) {
        setLatestInterviewerSpokenTurn(spokenTurn);
        setTimeout(() => {
          playQuestionAudio(spokenTurn);
        }, 300);
      } else if (wasListening) {
        setTimeout(() => {
          resumeListening();
        }, 300);
      }
    } else {
      setShowEndModal(true);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    activeQuestionIndex,
    totalQuestions,
    isMuted,
    onSubmitAnswer,
    onAdvanceQuestion,
    stopQuestionAudio,
    pauseListening,
    resumeListening,
    clearTranscript,
    playQuestionAudio
  ]);

  // Turn-Taking Engine: Detect natural pause in candidate speech and auto-trigger AI turn
  useEffect(() => {
    if (!isListening || isSpeakingQuestion || isSubmitting) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (isFinishingTurn) {
        setIsFinishingTurn(false);
      }
      return;
    }

    const hasSpeechText = Boolean(interimTranscript.trim() || transcript.trim());
    if (hasSpeechText) {
      hasSpokenInCurrentTurnRef.current = true;
    }

    if (hasSpokenInCurrentTurnRef.current) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      const finishNoticeTimer = setTimeout(() => {
        setIsFinishingTurn(true);
      }, 1200);

      silenceTimerRef.current = setTimeout(() => {
        setIsFinishingTurn(false);
        const composedAnswer = composeFinalAnswer(
          currentScratchpadRef.current,
          transcriptRef.current,
          interimTranscriptRef.current
        ).trim();

        if (
          hasSpokenInCurrentTurnRef.current &&
          composedAnswer.length >= 2 &&
          !isSubmittingRef.current &&
          !isSpeakingQuestionRef.current
        ) {
          handleNextQuestion();
        }
      }, 2000);

      return () => {
        clearTimeout(finishNoticeTimer);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };
    }
  }, [interimTranscript, transcript, isListening, isSpeakingQuestion, isSubmitting, handleNextQuestion]);

  const handlePrevQuestion = useCallback(() => {
    stopQuestionAudio();
    if (isListening) {
      stopSpeaking();
    }
    if (onPreviousQuestion) {
      onPreviousQuestion();
    } else if (activeQuestionIndex > 0) {
      setInternalQuestionIndex(prev => prev - 1);
    }
  }, [activeQuestionIndex, onPreviousQuestion, stopQuestionAudio, stopSpeaking, isListening]);

  const handleTogglePlayQuestion = useCallback(() => {
    if (isSpeakingQuestion) {
      stopQuestionAudio();
    } else {
      const textToPlay = activeInterviewerSpokenTurn || `${currentQuestion.title}. ${currentQuestion.question}`;
      playQuestionAudio(textToPlay);
    }
  }, [isSpeakingQuestion, activeInterviewerSpokenTurn, currentQuestion, stopQuestionAudio, playQuestionAudio]);

  const handleEndCallConfirmed = useCallback(() => {
    cleanupMedia();
    setShowEndModal(false);
    onEndInterview();
  }, [cleanupMedia, onEndInterview]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Status & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#26304A] bg-[#151D32] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 px-3 py-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8F34A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8F34A]"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-[#B8F34A] font-mono">
              Live Session
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#F5F7FF] border-l border-[#26304A] pl-3">
            <span className="font-bold">{config.targetRole}</span>
            {config.companyName ? (
              <>
                <span className="text-[#737E98]">@</span>
                <span className="text-[#9B7CFF] font-bold">{config.companyName}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Center Progress & Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-[#11182B] border border-[#26304A] px-3 py-1.5 text-xs font-mono">
            <Clock className="h-3.5 w-3.5 text-[#7C5CFF]" />
            <span className="font-bold text-[#F5F7FF] tracking-wider">{formatTimer(secondsRemaining)}</span>
            <span className="text-[10px] text-[#737E98]">remaining</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#AAB4CC]">
            <span>Progress:</span>
            <span className="font-mono font-bold text-[#9B7CFF]">
              Q{activeQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* LiveKit / Security / Media Status & End Button */}
        <div className="flex items-center gap-3">
          {isLiveKitConnected ? (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#B8F34A] bg-[#11182B] border border-[#B8F34A]/30 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#B8F34A] animate-pulse" />
              <span>LiveKit RAG WebRTC: Active ({livekitParticipants} connected)</span>
            </div>
          ) : isLiveKitConnecting ? (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#9B7CFF] bg-[#11182B] border border-[#7C5CFF]/30 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#9B7CFF] animate-ping" />
              <span>Connecting to LiveKit Cloud...</span>
            </div>
          ) : (
            <button
              onClick={reconnectLiveKit}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#AAB4CC] hover:text-[#F5F7FF] bg-[#11182B] border border-[#26304A] px-2.5 py-1 rounded-lg transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-[#737E98]" />
              <span>LiveKit: Connect</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-[#AAB4CC] bg-[#11182B] border border-[#26304A] px-2.5 py-1 rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5 text-[#B8F34A]" />
            <span>Low-Latency Pipeline</span>
          </div>

          <button
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#FF6B6B]/20 hover:bg-[#FF6B6B]/30 border border-[#FF6B6B]/40 px-3.5 py-1.5 text-xs font-bold text-[#FF6B6B] transition-all active:scale-95 shadow-sm"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Feeds (AI Avatar & Candidate Camera) + Right Workspace */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column: AI Avatar Feed & Candidate Camera Feed (5 cols) */}
        <div className="space-y-4 lg:col-span-5 flex flex-col">
          {/* AI Interviewer Video Avatar Feed */}
          <div className="relative overflow-hidden rounded-2xl border border-[#26304A] bg-[#11182B] p-4 shadow-xl min-h-[250px] flex flex-col justify-between text-[#F5F7FF]">
            <div className="pointer-events-none absolute inset-0 bg-dark-grid opacity-20" />

            {/* Top Bar inside AI Feed */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-[#0B1020]/80 border border-[#26304A] px-2.5 py-1 backdrop-blur-md">
                <Bot className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span className="text-xs font-bold text-[#F5F7FF]">Dr. Maya (AI Lead Evaluator)</span>
              </div>

              {/* Dynamic Voice State Badge */}
              <div className="flex items-center gap-1.5 rounded-lg bg-[#1B243B] border border-[#26304A] px-2.5 py-1 text-[11px] font-bold text-[#9B7CFF]">
                <span className={`h-2 w-2 rounded-full ${isSpeakingQuestion ? 'bg-[#B8F34A] animate-ping' : isListening ? 'bg-[#7C5CFF] animate-pulse' : 'bg-[#B8F34A]'}`} />
                <span className="capitalize">
                  {isSpeakingQuestion
                    ? 'Speaking Follow-Up'
                    : isSubmitting
                    ? 'Dr. Maya is Thinking...'
                    : isFinishingTurn
                    ? 'Finishing Turn...'
                    : isListening
                    ? 'Listening to Candidate...'
                    : 'Adaptive Engine Ready'}
                </span>
              </div>
            </div>

            {/* AI Avatar & Audio Spectrum Wave */}
            <div className="relative z-10 my-3 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-lg transition-all ${
                  isSpeakingQuestion
                    ? 'border-[#B8F34A] bg-[#1B243B] shadow-[#B8F34A]/20 scale-105'
                    : 'border-[#7C5CFF]/40 bg-[#1B243B] shadow-[#7C5CFF]/10'
                }`}>
                  <Sparkles className={`h-8 w-8 transition-colors ${isAgentSpeaking ? 'text-[#B8F34A]' : 'text-[#9B7CFF]'}`} />
                </div>
              </div>

              {/* Dynamic Animated Voice Wave Bars */}
              <div className="mt-3 flex items-center justify-center gap-1.5 h-8">
                {isAgentSpeaking ? (
                  <>
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-1" />
                    <span className="w-1.5 rounded-full bg-[#9B7CFF] animate-voice-bar-2" />
                    <span className="w-1.5 rounded-full bg-[#B8F34A] animate-voice-bar-3" />
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-4" />
                    <span className="w-1.5 rounded-full bg-[#9B7CFF] animate-voice-bar-5" />
                    <span className="w-1.5 rounded-full bg-[#B8F34A] animate-voice-bar-6" />
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-7" />
                  </>
                ) : isSubmitting ? (
                  <div className="flex items-center gap-2 text-xs text-[#9B7CFF] font-medium bg-[#1B243B] px-3 py-1 rounded-lg border border-[#7C5CFF]/30">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-[#9B7CFF] border-t-transparent animate-spin" />
                    <span>Dr. Maya is evaluating and preparing response...</span>
                  </div>
                ) : isFinishingTurn ? (
                  <div className="flex items-center gap-2 text-xs text-[#B8F34A] font-medium bg-[#1B243B] px-3 py-1 rounded-lg border border-[#B8F34A]/30">
                    <span className="h-2 w-2 rounded-full bg-[#B8F34A] animate-pulse" />
                    <span>Processing response pause...</span>
                  </div>
                ) : isListening ? (
                  <div className="flex items-center gap-2 text-xs text-[#9B7CFF] font-medium bg-[#1B243B] px-3 py-1 rounded-lg border border-[#7C5CFF]/30">
                    <span className="h-2 w-2 rounded-full bg-[#7C5CFF] animate-ping" />
                    <span>Recording candidate vocal frequencies...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#737E98]">
                    <span>Click &quot;Play Question Audio&quot; to hear Dr. Maya narrate</span>
                  </div>
                )}
              </div>

              {/* Spoken Follow-Up Context from Dr. Maya */}
              {activeInterviewerSpokenTurn && (
                <div className="mt-3 w-full rounded-xl border border-[#7C5CFF]/30 bg-[#0B1020]/90 p-2.5 backdrop-blur-sm text-left">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#9B7CFF] mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#B8F34A]" />
                      Dr. Maya&apos;s Follow-Up
                    </span>
                    <button
                      type="button"
                      onClick={() => playQuestionAudio(activeInterviewerSpokenTurn)}
                      className="text-[#B8F34A] hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Volume2 className="h-3 w-3" /> Replay
                    </button>
                  </div>
                  <p className="text-xs text-[#E2E8F0] italic leading-relaxed line-clamp-3">
                    &ldquo;{activeInterviewerSpokenTurn}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Controls inside AI Feed */}
            <div className="relative z-10 flex items-center justify-between text-[11px] text-[#AAB4CC] border-t border-[#26304A] pt-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-[#7C5CFF]" />
                <span>AI Voice Synthesis</span>
              </div>
              <button
                onClick={handleTogglePlayQuestion}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                  isSpeakingQuestion
                    ? 'bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 text-[#FF6B6B] hover:bg-[#FF6B6B]/30'
                    : 'bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 text-[#9B7CFF] hover:bg-[#7C5CFF]/30'
                }`}
              >
                {isSpeakingQuestion ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3 w-3" />}
                <span>{isSpeakingQuestion ? 'Stop Audio' : 'Play Question Audio'}</span>
              </button>
            </div>
          </div>

          {/* Candidate Camera Stream & Audio Controls */}
          <div className="relative overflow-hidden rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm min-h-[220px] flex flex-col justify-between">
            {/* Top Bar inside Candidate Feed */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-[#11182B] border border-[#26304A] px-2.5 py-1">
                <User className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span className="text-xs font-bold text-[#F5F7FF]">Candidate Feed</span>
              </div>

              {/* Status Badges: Mic & Camera */}
              <div className="flex items-center gap-2">
                {/* Dynamic Mic Status Badge */}
                {isMuted ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 px-2 py-0.5 text-[10px] font-bold text-[#FF6B6B]">
                    <MicOff className="h-3 w-3" />
                    <span>Muted</span>
                  </span>
                ) : isListening ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 px-2 py-0.5 text-[10px] font-bold text-[#B8F34A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B8F34A] animate-pulse" />
                    <span>Mic Live</span>
                  </span>
                ) : micState === 'requesting' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#7C5CFF]/10 border border-[#7C5CFF]/30 px-2 py-0.5 text-[10px] font-bold text-[#9B7CFF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9B7CFF] animate-pulse" />
                    <span>Connecting...</span>
                  </span>
                ) : micState === 'error' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#F5C451]/10 border border-[#F5C451]/30 px-2 py-0.5 text-[10px] font-bold text-[#F5C451]">
                    <AlertCircle className="h-3 w-3" />
                    <span>Mic Error</span>
                  </span>
                ) : (
                  <span className="rounded-lg bg-[#1B243B] border border-[#26304A] px-2 py-0.5 text-[10px] font-bold text-[#737E98]">
                    Mic Idle
                  </span>
                )}

                {/* Camera Status Badge */}
                {cameraState === 'active' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 px-2 py-0.5 text-[10px] font-bold text-[#B8F34A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B8F34A]" />
                    <span>Camera Live</span>
                  </span>
                ) : cameraState === 'denied' ? (
                  <span className="rounded-lg bg-[#F5C451]/10 border border-[#F5C451]/30 px-2 py-0.5 text-[10px] font-bold text-[#F5C451]">
                    Permission Denied
                  </span>
                ) : (
                  <span className="rounded-lg bg-[#1B243B] border border-[#26304A] px-2 py-0.5 text-[10px] font-bold text-[#737E98]">
                    Camera Off
                  </span>
                )}
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative my-2 flex flex-col items-center justify-center min-h-[120px] rounded-xl overflow-hidden bg-[#11182B] border border-[#26304A]">
              {cameraState === 'active' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover min-h-[140px] max-h-[180px] rounded-xl transform -scale-x-100"
                />
              ) : cameraState === 'requesting' ? (
                <div className="flex flex-col items-center justify-center p-6 text-xs text-[#AAB4CC] space-y-2">
                  <div className="h-6 w-6 rounded-full border-2 border-[#7C5CFF] border-t-transparent animate-spin" />
                  <span>Requesting camera permission...</span>
                </div>
              ) : cameraState === 'denied' ? (
                <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-[#F5C451] space-y-1">
                  <AlertCircle className="h-6 w-6 text-[#F5C451] mb-1" />
                  <span className="font-bold">Camera Access Blocked</span>
                  <span className="text-[11px] text-[#AAB4CC]">You can still complete the full interview via voice and text.</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-[#737E98] space-y-2">
                  <VideoOff className="h-7 w-7 text-[#737E98]" />
                  <span className="text-xs font-medium">Camera is currently paused</span>
                  <button
                    onClick={enableCamera}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B243B] hover:bg-[#26304A] border border-[#26304A] px-3 py-1 text-[11px] font-bold text-[#F5F7FF] transition-all"
                  >
                    <Video className="h-3 w-3 text-[#7C5CFF]" />
                    <span>Enable Camera Preview</span>
                  </button>
                </div>
              )}
            </div>

            {/* Candidate Controls: Mute/Unmute Mic & Turn On/Off Camera */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#26304A] pt-2">
              <div className="flex items-center gap-2">
                {/* Dedicated Microphone Mute / Unmute / Start Button */}
                <button
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute microphone' : isListening ? 'Mute microphone' : 'Start microphone'}
                  aria-pressed={isListening}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                    isMuted
                      ? 'bg-[#FF6B6B]/20 border-[#FF6B6B]/40 text-[#FF6B6B] hover:bg-[#FF6B6B]/30'
                      : isListening
                      ? 'bg-[#B8F34A]/20 border-[#B8F34A]/40 text-[#B8F34A] hover:bg-[#B8F34A]/30'
                      : micState === 'error'
                      ? 'bg-[#F5C451]/20 border-[#F5C451]/40 text-[#F5C451] hover:bg-[#F5C451]/30'
                      : 'bg-[#1B243B] border-[#26304A] text-[#AAB4CC] hover:text-[#F5F7FF]'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : isListening ? (
                    <Mic className="h-3.5 w-3.5" />
                  ) : micState === 'error' ? (
                    <RotateCcw className="h-3.5 w-3.5 text-[#F5C451]" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isMuted
                      ? 'Unmute Mic'
                      : isListening
                      ? 'Mute Mic'
                      : micState === 'error'
                      ? 'Retry Mic'
                      : micState === 'requesting'
                      ? 'Connecting...'
                      : 'Start Mic'}
                  </span>
                </button>

                {/* Camera Toggle Button */}
                <button
                  onClick={toggleCamera}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                    cameraState === 'active'
                      ? 'bg-[#1B243B] border-[#26304A] text-[#F5F7FF] hover:bg-[#26304A]'
                      : 'bg-[#7C5CFF]/20 border-[#7C5CFF]/40 text-[#9B7CFF] hover:bg-[#7C5CFF]/30'
                  }`}
                >
                  {cameraState === 'active' ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  <span>{cameraState === 'active' ? 'Turn Off Cam' : 'Turn On Cam'}</span>
                </button>
              </div>

              <span className="text-[10px] text-[#737E98] hidden sm:inline">
                Local stream • Private
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Active Question, Voice Transcription & Editable Answer (7 cols) */}
        <div className="space-y-4 lg:col-span-7 flex flex-col">
          {/* Main Question / Answer Card */}
          <div className="flex-1 rounded-2xl border border-[#26304A] bg-[#151D32] p-5 shadow-sm flex flex-col justify-between space-y-4">
            {/* Header Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26304A] pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#7C5CFF] px-2.5 py-1 text-xs font-bold text-[#F5F7FF] font-mono">
                  Question {activeQuestionIndex + 1}
                </span>
                <span className="rounded-lg bg-[#1B243B] border border-[#26304A] px-2 py-0.5 text-[11px] font-bold text-[#9B7CFF]">
                  {currentQuestion.topic}
                </span>
                <span className="rounded-lg bg-[#1B243B] border border-[#26304A] px-2 py-0.5 text-[11px] font-bold text-[#F5C451]">
                  {currentQuestion.difficulty}
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 rounded-lg bg-[#11182B] p-1 border border-[#26304A]">
                <button
                  onClick={() => setActiveTab('question')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                    activeTab === 'question'
                      ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                      : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>Question Scenario</span>
                </button>

                <button
                  onClick={() => setActiveTab('scratchpad')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                    activeTab === 'scratchpad'
                      ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                      : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
                  }`}
                >
                  <Code2 className="h-3 w-3" />
                  <span>Answer & Voice Notes</span>
                </button>

                <button
                  onClick={() => setActiveTab('hints')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                    activeTab === 'hints'
                      ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                      : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
                  }`}
                >
                  <Lightbulb className="h-3 w-3" />
                  <span>Hints ({currentQuestion.hints.length})</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Question Scenario */}
            {activeTab === 'question' && (
              <div className="space-y-4">
                {/* Natural Conversational Follow-Up Banner */}
                {activeInterviewerSpokenTurn && (
                  <div className="rounded-xl border border-[#7C5CFF]/40 bg-[#1B243B]/90 p-3.5 flex items-start gap-3 shadow-md">
                    <div className="p-1.5 rounded-lg bg-[#7C5CFF]/20 text-[#9B7CFF] shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9B7CFF]">
                          Dr. Maya&apos;s Follow-Up &amp; Evaluation Context
                        </span>
                        <button
                          type="button"
                          onClick={() => playQuestionAudio(activeInterviewerSpokenTurn)}
                          className="text-xs text-[#B8F34A] hover:underline flex items-center gap-1 font-semibold shrink-0"
                        >
                          <Volume2 className="h-3.5 w-3.5" /> Listen
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-[#F5F7FF] mt-1.5 leading-relaxed italic">
                        &ldquo;{activeInterviewerSpokenTurn}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#F5F7FF] leading-snug">
                      {currentQuestion.title}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#AAB4CC] leading-relaxed whitespace-pre-line font-medium">
                      {currentQuestion.question}
                    </p>
                  </div>
                  <button
                    onClick={handleTogglePlayQuestion}
                    className="shrink-0 p-2.5 rounded-xl bg-[#1B243B] hover:bg-[#26304A] border border-[#26304A] text-[#9B7CFF] transition-all"
                    title={isSpeakingQuestion ? 'Stop AI Voice' : 'Listen to Dr. Maya speak this question'}
                  >
                    {isSpeakingQuestion ? <Square className="h-4 w-4 text-[#FF6B6B] fill-current" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>

                {/* Code Snippet if provided */}
                {currentQuestion.codeSnippet && (
                  <div className="overflow-hidden rounded-xl border border-[#26304A] bg-[#11182B]">
                    <div className="flex items-center justify-between border-b border-[#26304A] bg-[#0B1020] px-3 py-1.5 text-[11px] text-[#737E98] font-mono font-bold">
                      <span>Scenario Architecture Snippet</span>
                      <span className="text-[#9B7CFF]">READ-ONLY</span>
                    </div>
                    <pre className="p-3.5 text-xs text-[#F5F7FF] font-mono overflow-x-auto leading-relaxed">
                      <code>{currentQuestion.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Voice Input Quickbar inside Question View */}
                <div className="rounded-xl border border-[#26304A] bg-[#11182B] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-3 w-3 rounded-full ${
                        isMuted
                          ? 'bg-[#FF6B6B]'
                          : isListening
                          ? 'bg-[#B8F34A] animate-ping'
                          : micState === 'requesting'
                          ? 'bg-[#9B7CFF] animate-pulse'
                          : micState === 'error'
                          ? 'bg-[#F5C451]'
                          : 'bg-[#7C5CFF]'
                      }`}
                    />
                    <span className="text-xs font-bold text-[#F5F7FF]">
                      {isMuted
                        ? 'Microphone Muted'
                        : isSubmitting
                        ? 'Dr. Maya is Thinking...'
                        : isFinishingTurn
                        ? 'Pause Detected — Finishing Turn...'
                        : isListening
                        ? 'Microphone Active — Speaking live...'
                        : micState === 'requesting'
                        ? 'Requesting Microphone Access...'
                        : micState === 'error'
                        ? 'Microphone Error'
                        : 'Microphone Ready'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mute/Unmute Toggle in Quickbar */}
                    <button
                      onClick={handleToggleMute}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                        isMuted
                          ? 'bg-[#FF6B6B]/20 border-[#FF6B6B]/40 text-[#FF6B6B] hover:bg-[#FF6B6B]/30'
                          : isListening
                          ? 'bg-[#B8F34A]/20 border-[#B8F34A]/40 text-[#B8F34A] hover:bg-[#B8F34A]/30'
                          : 'bg-[#1B243B] border-[#26304A] text-[#AAB4CC] hover:text-[#F5F7FF]'
                      }`}
                    >
                      {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      <span>{isMuted ? 'Unmute' : isListening ? 'Mute' : 'Start Mic'}</span>
                    </button>

                    {isListening ? (
                      <button
                        onClick={stopSpeaking}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF6B6B] px-3.5 py-1.5 text-xs font-bold text-[#F5F7FF] shadow-sm hover:bg-[#FF8585] transition-all"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        <span>Stop Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startSpeaking()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFF] px-3.5 py-1.5 text-xs font-bold text-[#F5F7FF] shadow-sm hover:bg-[#9B7CFF] transition-all"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Start Speaking</span>
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab('scratchpad')}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#1B243B] border border-[#26304A] px-3 py-1.5 text-xs font-bold text-[#AAB4CC] hover:text-[#F5F7FF]"
                    >
                      <Code2 className="h-3 w-3" />
                      <span>Edit Full Answer</span>
                    </button>
                  </div>
                </div>

                {/* Mic Error Banner with Retry in Question View */}
                {micError && (
                  <div className="rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-xs text-[#F5C451] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{micError}</span>
                    </div>
                    <button
                      onClick={() => startSpeaking()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5C451]/20 hover:bg-[#F5C451]/30 border border-[#F5C451]/40 font-bold text-xs text-[#F5C451] transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry Microphone</span>
                    </button>
                  </div>
                )}

                {/* Real-Time Live Transcript Preview */}
                {(isListening || displayInterim || currentScratchpad) && (
                  <div className="rounded-xl border border-[#26304A] bg-[#1B243B] p-3 text-xs text-[#F5F7FF] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9B7CFF]">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Candidate Answer Buffer (Editable in Scratchpad)</span>
                      </span>
                      <span className="font-mono text-[#B8F34A]">
                        {isSubmitting ? 'Evaluating...' : isFinishingTurn ? 'Finishing Turn...' : 'Auto-Saved'}
                      </span>
                    </div>
                    <div className="text-[#F5F7FF] font-medium leading-relaxed whitespace-pre-wrap">
                      {currentScratchpad ? <span>{currentScratchpad}</span> : null}
                      {displayInterim ? (
                        <span className="text-[#9B7CFF] font-semibold italic"> {displayInterim}...</span>
                      ) : null}
                      {!currentScratchpad && !displayInterim && (
                        <span className="text-[#737E98] italic text-xs">
                          {isListening ? 'Listening for your response... Speak now.' : 'Start speaking or type your answer.'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Candidate Live Scratchpad & Voice Transcription Editor */}
            {activeTab === 'scratchpad' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#737E98] font-medium">
                  <span>Speak with microphone or type your technical answer below:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                        isMuted
                          ? 'bg-[#FF6B6B]/20 border-[#FF6B6B]/40 text-[#FF6B6B]'
                          : isListening
                          ? 'bg-[#B8F34A]/20 border-[#B8F34A]/40 text-[#B8F34A]'
                          : 'bg-[#1B243B] border-[#26304A] text-[#AAB4CC] hover:text-[#F5F7FF]'
                      }`}
                    >
                      {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      <span>{isMuted ? 'Unmute Mic' : isListening ? 'Mute Mic' : 'Start Mic'}</span>
                    </button>

                    {isListening ? (
                      <button
                        onClick={stopSpeaking}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 px-2.5 py-1 text-xs font-bold text-[#FF6B6B] hover:bg-[#FF6B6B]/30"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        <span>Stop Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startSpeaking()}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 px-2.5 py-1 text-xs font-bold text-[#9B7CFF] hover:bg-[#7C5CFF]/30"
                      >
                        <Mic className="h-3 w-3" />
                        <span>Speak Answer</span>
                      </button>
                    )}

                    <span className="font-mono text-[10px] text-[#B8F34A] font-bold">Auto-saved to session</span>
                  </div>
                </div>

                {/* Mic Error Banner with Retry in Scratchpad */}
                {micError && (
                  <div className="rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-2.5 text-xs text-[#F5C451] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{micError}</span>
                    </div>
                    <button
                      onClick={() => startSpeaking()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5C451]/20 hover:bg-[#F5C451]/30 border border-[#F5C451]/40 font-bold text-xs text-[#F5C451] transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                <textarea
                  rows={9}
                  value={currentScratchpad}
                  onChange={e => {
                    const val = e.target.value;
                    setScratchpads(prev => ({
                      ...prev,
                      [activeQuestionIndex]: val
                    }));
                  }}
                  placeholder="Type out thoughts, pseudo-code, or architecture notes for this question, or use the microphone to speak..."
                  className="w-full rounded-xl border border-[#26304A] bg-[#11182B] p-3 text-xs text-[#F5F7FF] font-mono leading-relaxed focus:border-[#7C5CFF] focus:outline-none"
                />

                {displayInterim && (
                  <div className="text-xs text-[#9B7CFF] italic bg-[#11182B] p-2 rounded-lg border border-[#26304A]">
                    Listening: {displayInterim}...
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Hints & Guidance */}
            {activeTab === 'hints' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F5C451]">
                  <Lightbulb className="h-4 w-4" />
                  <span>Adaptive System Hints (Provided without penalty)</span>
                </div>
                <div className="space-y-2">
                  {currentQuestion.hints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#26304A] bg-[#11182B] p-3 text-xs text-[#F5F7FF] space-y-1"
                    >
                      <span className="font-bold text-[#F5C451] font-mono">Hint #{idx + 1}:</span>
                      <p className="text-[#AAB4CC] font-medium">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Warning Alert */}
            {validationWarning && (
              <div className="rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-2.5 text-xs text-[#F5C451] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationWarning}</span>
              </div>
            )}

            {/* Bottom Actions Bar inside Question Area */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#26304A] pt-3">
              <button
                disabled={activeQuestionIndex === 0}
                onClick={handlePrevQuestion}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#26304A] bg-[#1B243B] px-3.5 py-2 text-xs font-bold text-[#F5F7FF] hover:bg-[#26304A] disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('hints')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#26304A] bg-[#1B243B] px-3.5 py-2 text-xs font-bold text-[#F5C451] hover:bg-[#26304A] transition-all"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Request Hint</span>
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-[#F5F7FF] shadow-md shadow-[#7C5CFF]/20 transition-all ${
                    isSubmitting ? 'bg-[#7C5CFF]/50 cursor-not-allowed' : 'bg-[#7C5CFF] hover:bg-[#9B7CFF] active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Dr. Maya Responding...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {activeQuestionIndex < totalQuestions - 1
                          ? 'Submit Answer & Next Question'
                          : 'Complete Interview & View Report'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Closed Captions Floating Banner */}
          {isCaptionsOn && (displayInterim || (isListening && !isMuted)) && (
            <div className="rounded-xl bg-[#0B1020]/90 border border-[#7C5CFF]/40 p-2.5 text-xs text-[#F5F7FF] flex items-center gap-2 shadow-lg backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#B8F34A] animate-pulse shrink-0" />
              <span className="font-bold text-[#9B7CFF] shrink-0 font-mono text-[11px]">LIVE CAPTIONS:</span>
              <span className="italic truncate text-[#F5F7FF]">
                {displayInterim ? `"${displayInterim}"` : 'Listening for vocal input...'}
              </span>
            </div>
          )}

          {/* Media & Call Controls Footer */}
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#26304A] bg-[#151D32] p-3 shadow-sm">
            {/* Mute/Unmute Toggle Button */}
            <button
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute microphone' : isListening ? 'Mute microphone' : 'Start microphone'}
              aria-pressed={isListening}
              className={`flex h-10 px-4 items-center gap-2 rounded-xl transition-all font-bold text-xs shadow-sm ${
                isMuted
                  ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/40 hover:bg-[#FF6B6B]/30'
                  : isListening
                  ? 'bg-[#B8F34A]/20 text-[#B8F34A] border border-[#B8F34A]/40 hover:bg-[#B8F34A]/30'
                  : micState === 'error'
                  ? 'bg-[#F5C451]/20 text-[#F5C451] border border-[#F5C451]/40 hover:bg-[#F5C451]/30'
                  : 'bg-[#1B243B] text-[#F5F7FF] hover:bg-[#26304A] border border-[#26304A]'
              }`}
              title={
                isMuted
                  ? 'Click to Unmute Microphone'
                  : isListening
                  ? 'Click to Mute Microphone'
                  : micState === 'error'
                  ? 'Click to Retry Microphone'
                  : 'Click to Start Microphone'
              }
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : isListening ? (
                <Mic className="h-4 w-4 text-[#B8F34A]" />
              ) : micState === 'error' ? (
                <RotateCcw className="h-4 w-4 text-[#F5C451]" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>
                {isMuted
                  ? 'Muted'
                  : isListening
                  ? 'Mute'
                  : micState === 'error'
                  ? 'Retry'
                  : micState === 'requesting'
                  ? 'Connecting'
                  : 'Start Mic'}
              </span>
            </button>

            {/* Video Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`flex h-10 px-3 items-center gap-1.5 rounded-xl transition-all ${
                cameraState === 'active'
                  ? 'bg-[#1B243B] text-[#B8F34A] border border-[#B8F34A]/40 text-xs font-bold'
                  : 'bg-[#1B243B] text-[#737E98] hover:bg-[#26304A] border border-[#26304A] text-xs font-bold'
              }`}
              title={cameraState === 'active' ? 'Turn Off Webcam' : 'Turn On Webcam'}
            >
              {cameraState === 'active' ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              <span>{cameraState === 'active' ? 'Camera Live' : 'Camera Off'}</span>
            </button>

            {/* Speaker / Question Audio Narration Toggle */}
            <button
              onClick={handleTogglePlayQuestion}
              className={`flex h-10 px-3 items-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
                isSpeakingQuestion
                  ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                  : 'bg-[#1B243B] text-[#AAB4CC] hover:bg-[#26304A] border border-[#26304A]'
              }`}
              title="Dr. Maya AI Audio Narration"
            >
              <Volume2 className="h-4 w-4" />
              <span>{isSpeakingQuestion ? 'Narrating...' : 'AI Voice'}</span>
            </button>

            {/* Captions Toggle */}
            <button
              onClick={() => setIsCaptionsOn(!isCaptionsOn)}
              className={`flex h-10 px-3 items-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
                isCaptionsOn
                  ? 'bg-[#7C5CFF] text-[#F5F7FF]'
                  : 'bg-[#1B243B] text-[#AAB4CC] border border-[#26304A]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>CC</span>
            </button>

            {/* End Call Button */}
            <button
              onClick={() => setShowEndModal(true)}
              className="flex h-10 px-4 items-center gap-2 rounded-xl bg-[#FF6B6B] text-[#F5F7FF] font-bold text-xs shadow-md hover:bg-[#FF8585] active:scale-95 transition-all"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to End Interview */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1020]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#26304A] bg-[#151D32] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F7FF]">
                  Finish Interview & Synthesize Results?
                </h3>
                <p className="text-xs text-[#AAB4CC]">
                  The AI evaluator will calculate your overall hiring score and benchmark your responses against the job description.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#11182B] border border-[#26304A] p-3 text-xs text-[#F5F7FF] space-y-1.5">
              <div className="flex justify-between">
                <span>Completed Questions:</span>
                <span className="font-mono text-[#9B7CFF] font-bold">{activeQuestionIndex + 1} / {totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Spent:</span>
                <span className="font-mono text-[#F5F7FF] font-bold">
                  {formatTimer(config.duration * 60 - secondsRemaining)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="rounded-xl border border-[#26304A] bg-[#1B243B] px-4 py-2 text-xs font-bold text-[#F5F7FF] hover:bg-[#26304A]"
              >
                Continue Interview
              </button>
              <button
                onClick={handleEndCallConfirmed}
                className="rounded-xl bg-[#7C5CFF] px-5 py-2 text-xs font-bold text-[#F5F7FF] shadow-sm hover:bg-[#9B7CFF]"
              >
                Generate Comprehensive Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
