'use client';

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InterviewSetup } from './components/InterviewSetup';
import { LiveInterview } from './components/LiveInterview';
import { InterviewResults } from './components/InterviewResults';
import {
  ScreenType,
  SkillItem,
  RecentInterview,
  InterviewConfig
} from './types/interview';
import {
  INITIAL_SKILLS,
  RECENT_INTERVIEWS,
  MOCK_EVALUATION_DATA
} from './data/mockData';
import { useInterviewSession } from './hooks/useInterviewSession';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [skills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [recentInterviews] = useState<RecentInterview[]>(RECENT_INTERVIEWS);

  // Central interview session state hook
  const {
    session,
    startInterview,
    submitAnswer,
    advanceToNextQuestion,
    goToPreviousQuestion,
    completeInterview,
    resetInterview
  } = useInterviewSession();

  // Navigation handlers
  const handleStartNewInterview = () => {
    resetInterview();
    setCurrentScreen('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateInterview = async (newConfig: InterviewConfig) => {
    await startInterview(newConfig);
    setCurrentScreen('live');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEndLiveInterview = () => {
    completeInterview();
    setCurrentScreen('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewInterviewDetails = () => {
    setCurrentScreen('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    resetInterview();
    setCurrentScreen('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeEvaluation = session.evaluation || MOCK_EVALUATION_DATA;

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F5F7FF] flex flex-col selection:bg-[#7C5CFF] selection:text-[#F5F7FF]">
      {/* Top Navigation */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={screen => {
          setCurrentScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isLiveActive={currentScreen === 'live'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentScreen === 'dashboard' && (
          <Dashboard
            skills={skills}
            recentInterviews={recentInterviews}
            onStartNewInterview={handleStartNewInterview}
            onViewInterviewDetails={handleViewInterviewDetails}
          />
        )}

        {currentScreen === 'setup' && (
          <InterviewSetup
            initialConfig={session.config}
            onGenerateInterview={handleGenerateInterview}
            onCancel={handleBackToDashboard}
          />
        )}

        {currentScreen === 'live' && (
          <LiveInterview
            config={session.config}
            onEndInterview={handleEndLiveInterview}
            currentQuestionData={session.currentQuestion || undefined}
            questionIndex={session.currentQuestionIndex}
            totalQuestionsCount={session.questions.length}
            onSubmitAnswer={submitAnswer}
            onAdvanceQuestion={advanceToNextQuestion}
            onPreviousQuestion={goToPreviousQuestion}
          />
        )}

        {currentScreen === 'results' && (
          <InterviewResults
            evaluation={activeEvaluation}
            onRetake={handleRetake}
            onBackToDashboard={handleBackToDashboard}
          />
        )}
      </main>

      {/* Subtle Dark Footer */}
      <footer className="border-t border-[#26304A] bg-[#11182B] py-6 text-center text-xs text-[#737E98]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#7C5CFF]">SkillBridge</span>
            <span>• Adaptive Neural Technical Interview Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#737E98] font-medium">
            <span>Dark Premium AI Palette</span>
            <span>•</span>
            <span>Session Lifecycle: {session.status}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
