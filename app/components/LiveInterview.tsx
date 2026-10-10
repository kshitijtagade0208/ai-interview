'use client';

import React, { useState, useEffect } from 'react';
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
  VolumeX,
  Share2,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  MessageSquare,
  Code2,
  FileText,
  Activity,
  Bot,
  User,
  Cpu,
  AlertCircle,
  Square,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { QuestionData, InterviewConfig } from '../types/interview';
import {
  MOCK_INTERVIEW_QUESTIONS,
  generateDynamicFallbackQuestions
} from '../data/mockData';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { composeFinalAnswer } from '../lib/evaluation/scoring';

interface LiveInterviewProps {
  config: InterviewConfig;
  onEndInterview: () => void;
  // Session state hooks integration
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

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCaptionsOn, setIsCaptionsOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'question' | 'scratchpad' | 'hints'>('question');
  
  // Independent answer/scratchpad storage per question index
  const [scratchpads, setScratchpads] = useState<Record<number, string>>({});
  const currentScratchpad = scratchpads[activeQuestionIndex] ?? '';

  const [showEndModal, setShowEndModal] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Hook for Web Speech STT, TTS, and local Camera stream
  const {
    micState,
    micError,
    isListening,
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
  } = useVoiceInterview();

  // Dynamic AI state indicator
  const aiState: 'speaking' | 'listening' | 'evaluating' = 
    isSpeakingQuestion ? 'speaking' : isListening ? 'listening' : 'speaking';

  // Timer countdown
  const [secondsRemaining, setSecondsRemaining] = useState(config.duration * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync speech recognition transcript into current question's answer scratchpad
  useEffect(() => {
    if (transcript) {
      setScratchpads(prev => {
        const existing = prev[activeQuestionIndex] || '';
        // If scratchpad doesn't already contain the transcript text, append or update it
        if (!existing.includes(transcript)) {
          const updated = existing ? `${existing.trim()}\n${transcript}` : transcript;
          return {
            ...prev,
            [activeQuestionIndex]: updated
          };
        }
        return prev;
      });
      // Clear hook buffer once transferred
      clearTranscript();
    }
  }, [transcript, activeQuestionIndex, clearTranscript]);

  // Stop active speech when question changes
  useEffect(() => {
    stopQuestionAudio();
    if (isListening) {
      stopSpeaking();
    }
    setValidationWarning(null);
  }, [activeQuestionIndex, stopQuestionAudio, isListening, stopSpeaking]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextQuestion = () => {
    if (isSubmitting) return;

    // Compose final candidate answer across typed scratchpad, final transcript, and interim speech
    const candidateAnswer = composeFinalAnswer(currentScratchpad, transcript, interimTranscript);

    // Stop active audio and speech capture
    stopQuestionAudio();
    if (isListening) {
      stopSpeaking();
    }
    clearTranscript();

    // Guard against submitting an empty answer if in voice mode without any spoken content
    if (!candidateAnswer && isListening) {
      setValidationWarning('Please stop speaking or finish transcribing your answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    setValidationWarning(null);

    // Update scratchpad for current question with the final composed answer
    setScratchpads(prev => ({
      ...prev,
      [activeQuestionIndex]: candidateAnswer
    }));

    // Submit answer through existing evaluation pipeline
    if (onSubmitAnswer) {
      const effectiveResponse = candidateAnswer || 'Candidate presented verbal response.';
      onSubmitAnswer(effectiveResponse, candidateAnswer || undefined);
    }

    if (activeQuestionIndex < totalQuestions - 1) {
      if (onAdvanceQuestion) {
        onAdvanceQuestion();
      } else {
        setInternalQuestionIndex(prev => prev + 1);
      }
      setIsSubmitting(false);
    } else {
      setShowEndModal(true);
      setIsSubmitting(false);
    }
  };

  const handlePrevQuestion = () => {
    stopQuestionAudio();
    if (isListening) {
      stopSpeaking();
    }
    if (onPreviousQuestion) {
      onPreviousQuestion();
    } else if (activeQuestionIndex > 0) {
      setInternalQuestionIndex(prev => prev - 1);
    }
  };

  const handleTogglePlayQuestion = () => {
    if (isSpeakingQuestion) {
      stopQuestionAudio();
    } else {
      playQuestionAudio(`${currentQuestion.title}. ${currentQuestion.question}`);
    }
  };

  const handleEndCallConfirmed = () => {
    cleanupMedia();
    const candidateAnswer = composeFinalAnswer(currentScratchpad, transcript, interimTranscript);
    if (onSubmitAnswer && candidateAnswer) {
      onSubmitAnswer(candidateAnswer, candidateAnswer);
    }
    setShowEndModal(false);
    onEndInterview();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-12">
      {/* Top Session Bar */}
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
            <span>Round Progress:</span>
            <span className="font-mono font-bold text-[#9B7CFF]">
              Q{activeQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* Security / Media Status & End Button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-[#AAB4CC] bg-[#11182B] border border-[#26304A] px-2.5 py-1 rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5 text-[#B8F34A]" />
            <span>Encrypted • Local Audio & Video</span>
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

      {/* Main Grid: Left Feeds (AI Avatar & Candidate Camera) + Right Workspace (Question & Voice Input) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column: AI Avatar Feed & Candidate Camera Feed (5 cols) */}
        <div className="space-y-4 lg:col-span-5 flex flex-col">
          {/* AI Interviewer Video Avatar Feed */}
          <div className="relative overflow-hidden rounded-2xl border border-[#26304A] bg-[#11182B] p-4 shadow-xl min-h-[250px] flex flex-col justify-between text-[#F5F7FF]">
            {/* Subtle Grid */}
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
                    ? 'Speaking Question'
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
                  <Sparkles className={`h-8 w-8 transition-colors ${isSpeakingQuestion ? 'text-[#B8F34A]' : 'text-[#9B7CFF]'}`} />
                </div>
              </div>

              {/* Dynamic Animated Voice Wave Bars */}
              <div className="mt-3 flex items-center justify-center gap-1.5 h-8">
                {isSpeakingQuestion ? (
                  <>
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-1" />
                    <span className="w-1.5 rounded-full bg-[#9B7CFF] animate-voice-bar-2" />
                    <span className="w-1.5 rounded-full bg-[#B8F34A] animate-voice-bar-3" />
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-4" />
                    <span className="w-1.5 rounded-full bg-[#9B7CFF] animate-voice-bar-5" />
                    <span className="w-1.5 rounded-full bg-[#B8F34A] animate-voice-bar-6" />
                    <span className="w-1.5 rounded-full bg-[#7C5CFF] animate-voice-bar-7" />
                  </>
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
            </div>

            {/* Bottom Controls inside AI Feed */}
            <div className="relative z-10 flex items-center justify-between text-[11px] text-[#AAB4CC] border-t border-[#26304A] pt-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-[#7C5CFF]" />
                <span>Web Speech AI Voice Synthesis</span>
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

          {/* Candidate Camera Stream (Local WebRTC / MediaStream) */}
          <div className="relative overflow-hidden rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm min-h-[220px] flex flex-col justify-between">
            {/* Top Bar inside Candidate Feed */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-[#11182B] border border-[#26304A] px-2.5 py-1">
                <User className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span className="text-xs font-bold text-[#F5F7FF]">Candidate Feed</span>
              </div>

              {/* Camera State Badge */}
              <div className="flex items-center gap-1.5">
                {cameraState === 'active' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 px-2 py-0.5 text-[10px] font-bold text-[#B8F34A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B8F34A]" />
                    <span>Camera Live (Local)</span>
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

            {/* Privacy Telemetry Note */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-[#737E98] border-t border-[#26304A] pt-2">
              <span>Local stream only • No video transmitted or recorded</span>
              <button
                onClick={toggleCamera}
                className="text-[#9B7CFF] hover:underline font-bold text-[11px]"
              >
                {cameraState === 'active' ? 'Turn Off' : 'Turn On'}
              </button>
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
                    <span className={`flex h-3 w-3 rounded-full ${isListening ? 'bg-[#FF6B6B] animate-ping' : 'bg-[#B8F34A]'}`} />
                    <span className="text-xs font-bold text-[#F5F7FF]">
                      {isListening ? 'Microphone Active — Speaking live...' : 'Voice Answer Ready'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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
                        onClick={startSpeaking}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFF] px-3.5 py-1.5 text-xs font-bold text-[#F5F7FF] shadow-sm hover:bg-[#9B7CFF] transition-all"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Start Speaking Answer</span>
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

                {/* Real-Time Live Transcript Preview */}
                {(isListening || interimTranscript || currentScratchpad) && (
                  <div className="rounded-xl border border-[#26304A] bg-[#1B243B] p-3 text-xs text-[#F5F7FF] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9B7CFF]">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Candidate Answer Buffer (Editable)</span>
                      </span>
                      <span className="font-mono text-[#B8F34A]">Auto-Saved</span>
                    </div>
                    <p className="text-[#F5F7FF] font-medium leading-relaxed italic">
                      {currentScratchpad ? `"${currentScratchpad}"` : ''}
                      {interimTranscript ? <span className="text-[#9B7CFF] not-italic font-bold"> {interimTranscript}...</span> : null}
                    </p>
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
                        onClick={startSpeaking}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 px-2.5 py-1 text-xs font-bold text-[#9B7CFF] hover:bg-[#7C5CFF]/30"
                      >
                        <Mic className="h-3 w-3" />
                        <span>Speak Answer</span>
                      </button>
                    )}

                    <span className="font-mono text-[10px] text-[#B8F34A] font-bold">Auto-saved to session</span>
                  </div>
                </div>

                {/* Mic Error Banner if any */}
                {micError && (
                  <div className="rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-2.5 text-xs text-[#F5C451] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{micError}</span>
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

                {interimTranscript && (
                  <div className="text-xs text-[#9B7CFF] italic bg-[#11182B] p-2 rounded-lg border border-[#26304A]">
                    Listening: {interimTranscript}...
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
                  <span>
                    {activeQuestionIndex < totalQuestions - 1
                      ? 'Submit Answer & Next Question'
                      : 'Complete Interview & View Report'}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Media & Call Controls Footer */}
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#26304A] bg-[#151D32] p-3 shadow-sm">
            {/* Mic Toggle */}
            <button
              onClick={() => {
                if (isListening) {
                  stopSpeaking();
                } else {
                  startSpeaking();
                }
              }}
              className={`flex h-10 px-3 items-center gap-1.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-[#FF6B6B] text-[#F5F7FF] shadow-lg shadow-[#FF6B6B]/20 animate-pulse font-bold text-xs'
                  : 'bg-[#1B243B] text-[#F5F7FF] hover:bg-[#26304A] border border-[#26304A] text-xs font-bold'
              }`}
              title={isListening ? 'Stop Speaking' : 'Start Speaking'}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-[#737E98]" />}
              <span>{isListening ? 'Listening...' : 'Unmuted'}</span>
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
