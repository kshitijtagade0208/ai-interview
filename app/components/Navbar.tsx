'use client';

import React from 'react';
import {
  BrainCircuit,
  LayoutDashboard,
  Sliders,
  Video,
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ScreenType } from '../types/interview';

interface NavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isLiveActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  isLiveActive = false,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#26304A] bg-[#0B1020]/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate('dashboard')}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C5CFF] text-[#F5F7FF] shadow-md shadow-[#7C5CFF]/20">
            <BrainCircuit className="h-5 w-5" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#B8F34A] border-2 border-[#0B1020]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#F5F7FF] font-mono">
                Interview<span className="text-[#7C5CFF]">AI</span>
              </span>
              <span className="rounded-md bg-[#1B243B] px-2 py-0.5 text-[10px] font-bold text-[#9B7CFF] border border-[#26304A] uppercase tracking-wider">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-[#737E98] hidden sm:inline font-medium">
              Adaptive Neural Technical Evaluator
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-[#11182B] p-1 border border-[#26304A]">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                : 'text-[#AAB4CC] hover:text-[#F5F7FF] hover:bg-[#1B243B]'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('setup')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              currentScreen === 'setup'
                ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                : 'text-[#AAB4CC] hover:text-[#F5F7FF] hover:bg-[#1B243B]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Setup Interview</span>
          </button>

          <button
            onClick={() => onNavigate('live')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all relative ${
              currentScreen === 'live'
                ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                : 'text-[#AAB4CC] hover:text-[#F5F7FF] hover:bg-[#1B243B]'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Live Session</span>
            <span className="flex h-2 w-2 relative ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8F34A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8F34A]"></span>
            </span>
          </button>

          <button
            onClick={() => onNavigate('results')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              currentScreen === 'results'
                ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                : 'text-[#AAB4CC] hover:text-[#F5F7FF] hover:bg-[#1B243B]'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Latest Report</span>
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Quick CTA */}
          {currentScreen !== 'setup' && currentScreen !== 'live' && (
            <button
              onClick={() => onNavigate('setup')}
              className="group hidden sm:inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-4 py-2 text-xs font-semibold text-[#F5F7FF] shadow-md shadow-[#7C5CFF]/20 hover:bg-[#9B7CFF] transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#B8F34A]" />
              <span>New Interview</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 rounded-xl bg-[#151D32] p-1.5 pr-3 border border-[#26304A]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C5CFF] text-xs font-bold text-[#F5F7FF]">
              AK
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-[#F5F7FF] leading-tight">Alex Rivera</span>
              <span className="text-[10px] text-[#737E98] leading-tight font-medium">Senior Candidate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Screen Selector */}
      <div className="flex md:hidden border-t border-[#26304A] bg-[#11182B] px-3 py-2 justify-around">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`px-3 py-1 rounded-md text-xs font-semibold ${
            currentScreen === 'dashboard' ? 'bg-[#7C5CFF] text-[#F5F7FF]' : 'text-[#AAB4CC]'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('setup')}
          className={`px-3 py-1 rounded-md text-xs font-semibold ${
            currentScreen === 'setup' ? 'bg-[#7C5CFF] text-[#F5F7FF]' : 'text-[#AAB4CC]'
          }`}
        >
          Setup
        </button>
        <button
          onClick={() => onNavigate('live')}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
            currentScreen === 'live' ? 'bg-[#7C5CFF] text-[#F5F7FF]' : 'text-[#AAB4CC]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#B8F34A]" />
          Live
        </button>
        <button
          onClick={() => onNavigate('results')}
          className={`px-3 py-1 rounded-md text-xs font-semibold ${
            currentScreen === 'results' ? 'bg-[#7C5CFF] text-[#F5F7FF]' : 'text-[#AAB4CC]'
          }`}
        >
          Results
        </button>
      </div>
    </header>
  );
};
