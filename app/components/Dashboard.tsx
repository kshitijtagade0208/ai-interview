'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Award,
  Clock,
  Target,
  BarChart3,
  Play,
  FileText,
  Cpu,
  Eye,
  Mic2,
  ChevronRight,
  Plus
} from 'lucide-react';
import { SkillItem, RecentInterview } from '../types/interview';

interface DashboardProps {
  skills: SkillItem[];
  recentInterviews: RecentInterview[];
  onStartNewInterview: () => void;
  onViewInterviewDetails: (interviewId: string) => void;
  onSelectSkillForPractice?: (skillName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  skills,
  recentInterviews,
  onStartNewInterview,
  onViewInterviewDetails
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredSkills = selectedCategory === 'all'
    ? skills
    : skills.filter(s => s.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Skills' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'backend', label: 'Backend & APIs' },
    { id: 'system-design', label: 'System Design' },
    { id: 'ai-ml', label: 'AI & Data' },
    { id: 'soft-skills', label: 'Communication' }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Hero / Announcement Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#26304A] bg-[#151D32] p-6 sm:p-10 shadow-xl">
        {/* Subtle dark pattern */}
        <div className="pointer-events-none absolute inset-0 bg-dark-grid opacity-30" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#26304A] bg-[#1B243B] px-3.5 py-1 text-xs font-semibold text-[#9B7CFF]">
              <span className="flex h-2 w-2 rounded-full bg-[#B8F34A]" />
              <span>Next-Gen Adaptive Technical Evaluator</span>
              <span className="rounded-md bg-[#151D32] px-2 py-0.5 text-[10px] text-[#AAB4CC] font-mono border border-[#26304A]">
                v2.4 Active
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F5F7FF] leading-tight">
                Master technical interviews with <span className="text-[#9B7CFF]">Adaptive AI</span>.
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-[#AAB4CC] leading-relaxed">
                InterviewAI conducts dynamic, voice-driven mock interviews tailored specifically to your target role and job description. Questions evolve in real-time based on the technical depth and nuance of your answers.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F7FF] bg-[#1B243B] border border-[#26304A] px-3 py-1.5 rounded-xl">
                <Cpu className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span>Real-time Question Adaptation</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F7FF] bg-[#1B243B] border border-[#26304A] px-3 py-1.5 rounded-xl">
                <Mic2 className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span>Voice Cadence & Audio Signals</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#F5F7FF] bg-[#1B243B] border border-[#26304A] px-3 py-1.5 rounded-xl">
                <Eye className="h-3.5 w-3.5 text-[#7C5CFF]" />
                <span>Visual Engagement & Presence</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onStartNewInterview}
                className="inline-flex items-center gap-2.5 rounded-xl bg-[#7C5CFF] px-6 py-3.5 text-sm font-bold text-[#F5F7FF] shadow-lg shadow-[#7C5CFF]/20 hover:bg-[#9B7CFF] transition-all active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-[#F5F7FF] text-[#F5F7FF]" />
                <span>Start New Interview</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onViewInterviewDetails('int-001')}
                className="inline-flex items-center gap-2 rounded-xl border border-[#26304A] bg-[#1B243B] px-5 py-3.5 text-sm font-semibold text-[#F5F7FF] transition-all hover:bg-[#26304A]"
              >
                <FileText className="h-4 w-4 text-[#AAB4CC]" />
                <span>View Sample Evaluation</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Hero Card */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-[#26304A] bg-[#11182B] p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#26304A] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#AAB4CC]">
                  Readiness Index
                </span>
                <span className="flex items-center gap-1 rounded-md bg-[#B8F34A]/10 px-2 py-0.5 text-xs font-bold text-[#B8F34A] border border-[#B8F34A]/30">
                  <TrendingUp className="h-3 w-3" /> Top 6%
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#F5F7FF] font-mono tracking-tight">88.4</span>
                <span className="text-sm font-semibold text-[#AAB4CC]">/ 100 Score</span>
                <span className="ml-auto text-xs font-bold text-[#F5F7FF] bg-[#7C5CFF] px-2.5 py-1 rounded-lg">
                  Staff Ready
                </span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-medium text-[#AAB4CC] mb-1">
                    <span>System Architecture & Scale</span>
                    <span className="font-mono font-bold text-[#9B7CFF]">92%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1B243B] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: '92%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#AAB4CC] mb-1">
                    <span>Distributed Concurrency & Locking</span>
                    <span className="font-mono font-bold text-[#9B7CFF]">89%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1B243B] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: '89%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#AAB4CC] mb-1">
                    <span>Frontend Rendering & Virtualization</span>
                    <span className="font-mono font-bold text-[#9B7CFF]">91%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1B243B] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: '91%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#AAB4CC] mb-1">
                    <span>Communication & Trade-offs</span>
                    <span className="font-mono font-bold text-[#9B7CFF]">94%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1B243B] overflow-hidden">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#151D32] border border-[#26304A] p-3 text-[11px] text-[#F5F7FF] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#B8F34A] shrink-0" />
                <span>Next suggested drill: <strong className="text-[#9B7CFF]">Distributed Cache Partitioning</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#AAB4CC] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Drills</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
              <BrainCircuit className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FF] font-mono">14</div>
          <div className="mt-1 flex items-center text-[11px] font-semibold text-[#B8F34A] gap-1">
            <TrendingUp className="h-3 w-3" /> +3 this week
          </div>
        </div>

        <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#AAB4CC] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg. Evaluation</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FF] font-mono">88.4%</div>
          <div className="mt-1 flex items-center text-[11px] font-semibold text-[#B8F34A] gap-1">
            <TrendingUp className="h-3 w-3" /> +4.2% growth
          </div>
        </div>

        <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#AAB4CC] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Practice Time</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FF] font-mono">9.5 hrs</div>
          <div className="mt-1 flex items-center text-[11px] text-[#737E98]">
            Across 4 target roles
          </div>
        </div>

        <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#AAB4CC] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Target JD Match</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FF] font-mono">92%</div>
          <div className="mt-1 flex items-center text-[11px] font-semibold text-[#B8F34A]">
            High target role match
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Skill Profile & Recent Interviews */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Candidate Skill Profile (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#F5F7FF] tracking-tight flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-[#7C5CFF]" />
                Candidate Technical Skill Matrix
              </h2>
              <p className="text-xs text-[#AAB4CC]">
                Verified competencies and AI-calibrated proficiency levels
              </p>
            </div>

            <button
              onClick={onStartNewInterview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#26304A] bg-[#151D32] px-3 py-1.5 text-xs font-bold text-[#9B7CFF] hover:bg-[#1B243B] transition-all self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Calibrate Skills</span>
            </button>
          </div>

          {/* Skill Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-[#26304A] pb-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                    : 'bg-[#151D32] text-[#AAB4CC] border border-[#26304A] hover:bg-[#1B243B] hover:text-[#F5F7FF]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredSkills.map(skill => (
              <div
                key={skill.id}
                className="group relative rounded-xl border border-[#26304A] bg-[#151D32] p-3.5 transition-all hover:border-[#7C5CFF]/60 hover:bg-[#1B243B]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#F5F7FF] group-hover:text-[#9B7CFF] transition-colors">
                        {skill.name}
                      </span>
                      {skill.verified && (
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B8F34A]/10 text-[#B8F34A] text-[9px] font-bold border border-[#B8F34A]/30"
                          title="Verified Skill"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#737E98] uppercase tracking-wider font-mono">
                      {skill.category}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#9B7CFF] bg-[#11182B] px-2 py-0.5 rounded border border-[#26304A]">
                    {skill.level}%
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[#11182B] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7C5CFF]"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Past Interviews (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F5F7FF] tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#7C5CFF]" />
                Recent AI Interviews
              </h2>
              <p className="text-xs text-[#AAB4CC]">
                Evaluations & historical candidate scores
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {recentInterviews.map(interview => (
              <div
                key={interview.id}
                onClick={() => onViewInterviewDetails(interview.id)}
                className="group cursor-pointer rounded-2xl border border-[#26304A] bg-[#151D32] p-4 transition-all hover:border-[#7C5CFF]/60 hover:bg-[#1B243B]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F7FF] group-hover:text-[#9B7CFF] transition-colors">
                      {interview.role}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#AAB4CC] mt-0.5 font-medium">
                      <span className="text-[#9B7CFF] font-semibold">{interview.companyTarget}</span>
                      <span>•</span>
                      <span>{interview.date}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-base font-extrabold text-[#F5F7FF] font-mono">
                        {interview.overallScore}
                      </span>
                      <span className="text-[10px] text-[#737E98]">/100</span>
                    </div>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1B243B] text-[#9B7CFF] border border-[#26304A]">
                      {interview.verdict}
                    </span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[#26304A]">
                  {interview.skillsAssessed.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-[#11182B] px-2 py-0.5 text-[10px] font-medium text-[#AAB4CC] border border-[#26304A]"
                    >
                      {s}
                    </span>
                  ))}
                  <div className="ml-auto flex items-center text-xs font-bold text-[#9B7CFF] group-hover:translate-x-0.5 transition-transform gap-1">
                    <span>Full Analysis</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start Tip Box */}
          <div className="rounded-2xl border border-[#26304A] bg-[#11182B] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1B243B] text-[#9B7CFF] border border-[#26304A]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#F5F7FF]">Adaptive Difficulty Engine</h4>
                <p className="text-[11px] text-[#AAB4CC] leading-relaxed">
                  The AI interviewer tracks the depth of your answers in real-time. If you solve standard architectural trade-offs effortlessly, it will introduce concurrency chaos tests and multi-region failover scenarios.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
