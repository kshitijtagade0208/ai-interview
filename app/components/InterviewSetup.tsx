'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Briefcase,
  FileText,
  Tag,
  Gauge,
  Clock,
  CheckCircle,
  Play,
  Layers,
  ChevronRight,
  Plus,
  X,
  Camera,
  Mic,
  ShieldCheck,
  Info,
  Loader2,
  Check
} from 'lucide-react';
import {
  InterviewConfig,
  DifficultyLevel,
  InterviewDuration
} from '../types/interview';
import {
  AVAILABLE_SKILL_SUGGESTIONS,
  SAMPLE_JOB_DESCRIPTIONS
} from '../data/mockData';

interface InterviewSetupProps {
  initialConfig: InterviewConfig;
  onGenerateInterview: (config: InterviewConfig) => void;
  onCancel: () => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({
  initialConfig,
  onGenerateInterview,
  onCancel
}) => {
  const [config, setConfig] = useState<InterviewConfig>(initialConfig);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Sync state when initialConfig prop changes (e.g. upon starting a new interview)
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Quick preset sample JD loader
  const handleLoadSampleJD = (sampleIndex: number) => {
    const sample = SAMPLE_JOB_DESCRIPTIONS[sampleIndex];
    setConfig(prev => ({
      ...prev,
      targetRole: sample.role,
      companyName: sample.company,
      jobDescription: sample.text,
      selectedSkills: [...sample.skills]
    }));
  };

  const handleToggleSkill = (skill: string) => {
    setConfig(prev => {
      const exists = prev.selectedSkills.includes(skill);
      if (exists) {
        return {
          ...prev,
          selectedSkills: prev.selectedSkills.filter(s => s !== skill)
        };
      } else {
        return {
          ...prev,
          selectedSkills: [...prev.selectedSkills, skill]
        };
      }
    });
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkillInput.trim() && !config.selectedSkills.includes(customSkillInput.trim())) {
      setConfig(prev => ({
        ...prev,
        selectedSkills: [...prev.selectedSkills, customSkillInput.trim()]
      }));
      setCustomSkillInput('');
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenerationStep(1);

    const step2Timer = setTimeout(() => setGenerationStep(2), 600);
    const step3Timer = setTimeout(() => setGenerationStep(3), 1200);

    try {
      await onGenerateInterview(config);
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26304A] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9B7CFF]">
            <Sliders className="h-4 w-4" />
            <span>Interview Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F7FF] tracking-tight mt-1">
            Configure Your AI Interview
          </h1>
          <p className="text-xs sm:text-sm text-[#AAB4CC] mt-1">
            Specify the target role, job description, and skills to generate tailored adaptive questions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-[#26304A] bg-[#1B243B] px-4 py-2 text-xs font-bold text-[#F5F7FF] hover:bg-[#26304A] transition-all"
          >
            Cancel
          </button>
          <button
            disabled={isGenerating || config.selectedSkills.length === 0}
            onClick={handleStartGeneration}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-5 py-2.5 text-xs font-bold text-[#F5F7FF] shadow-md shadow-[#7C5CFF]/20 hover:bg-[#9B7CFF] transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#B8F34A]" />
                <span>Synthesizing Interview...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-[#F5F7FF] text-[#F5F7FF]" />
                <span>Generate & Start Interview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Overlay / Status Modal */}
      {isGenerating && (
        <div className="rounded-2xl border border-[#7C5CFF] bg-[#151D32] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B243B] text-[#7C5CFF] border border-[#26304A]">
              <Sparkles className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F7FF]">
                Preparing Adaptive Technical Interview
              </h3>
              <p className="text-xs text-[#AAB4CC]">
                Calibrating rubrics against {config.targetRole} requirements...
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                generationStep >= 1 ? 'bg-[#B8F34A]/20 text-[#B8F34A] border border-[#B8F34A]/40' : 'bg-[#1B243B] text-[#737E98]'
              }`}>
                {generationStep >= 1 ? <Check className="h-3 w-3" /> : '1'}
              </span>
              <span className={generationStep >= 1 ? 'text-[#F5F7FF] font-bold' : 'text-[#737E98]'}>
                Extracting technical competencies from Job Description
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                generationStep >= 2 ? 'bg-[#B8F34A]/20 text-[#B8F34A] border border-[#B8F34A]/40' : 'bg-[#1B243B] text-[#737E98]'
              }`}>
                {generationStep >= 2 ? <Check className="h-3 w-3" /> : '2'}
              </span>
              <span className={generationStep >= 2 ? 'text-[#F5F7FF] font-bold' : 'text-[#737E98]'}>
                Building adaptive branching questions ({config.difficulty.toUpperCase()} tier)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                generationStep >= 3 ? 'bg-[#B8F34A]/20 text-[#B8F34A] border border-[#B8F34A]/40' : 'bg-[#1B243B] text-[#737E98]'
              }`}>
                {generationStep >= 3 ? <Check className="h-3 w-3" /> : '3'}
              </span>
              <span className={generationStep >= 3 ? 'text-[#F5F7FF] font-bold' : 'text-[#737E98]'}>
                Initializing neural evaluator avatar and latency telemetry
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form Inputs (7 cols) + Live Preview Card (5 cols) */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Inputs Column */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Target Role & Company */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
              <Briefcase className="h-4 w-4 text-[#7C5CFF]" />
              <span>1. Target Role & Company</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#AAB4CC]">
                  Target Job Title *
                </label>
                <input
                  type="text"
                  value={config.targetRole}
                  onChange={e => setConfig({ ...config, targetRole: e.target.value })}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full rounded-xl border border-[#26304A] bg-[#11182B] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F7FF] placeholder-[#737E98] focus:border-[#7C5CFF] focus:outline-none focus:ring-1 focus:ring-[#7C5CFF] transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#AAB4CC]">
                  Target Company (Optional)
                </label>
                <input
                  type="text"
                  value={config.companyName}
                  onChange={e => setConfig({ ...config, companyName: e.target.value })}
                  placeholder="e.g. Stripe, OpenAI, Meta"
                  className="w-full rounded-xl border border-[#26304A] bg-[#11182B] px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F7FF] placeholder-[#737E98] focus:border-[#7C5CFF] focus:outline-none focus:ring-1 focus:ring-[#7C5CFF] transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Job Description Textarea */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
                <FileText className="h-4 w-4 text-[#7C5CFF]" />
                <span>2. Job Description (JD)</span>
              </div>

              {/* Sample JD loader quick buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#737E98] font-medium mr-1">Load Preset:</span>
                {SAMPLE_JOB_DESCRIPTIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSampleJD(idx)}
                    className="rounded-md border border-[#26304A] bg-[#1B243B] px-2 py-0.5 text-[10px] font-bold text-[#9B7CFF] hover:bg-[#26304A] hover:text-[#F5F7FF] transition-all"
                  >
                    {sample.company}
                  </button>
                ))}
                {config.jobDescription && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, companyName: '', jobDescription: '' }))}
                    className="rounded-md border border-[#26304A] bg-[#11182B] px-2 py-0.5 text-[10px] font-bold text-[#AAB4CC] hover:bg-[#1B243B] hover:text-[#FF6B6B] transition-all"
                  >
                    Clear JD
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <textarea
                rows={5}
                value={config.jobDescription}
                onChange={e => setConfig({ ...config, jobDescription: e.target.value })}
                placeholder="Paste the full job description or key responsibilities and requirements..."
                className="w-full rounded-xl border border-[#26304A] bg-[#11182B] p-3 text-xs sm:text-sm text-[#F5F7FF] placeholder-[#737E98] focus:border-[#7C5CFF] focus:outline-none focus:ring-1 focus:ring-[#7C5CFF] transition-all font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-[#737E98] px-1 font-medium">
                <span>The AI will extract required technical competencies automatically.</span>
                <span>{config.jobDescription.length} characters</span>
              </div>
            </div>
          </div>

          {/* 3. Skill Selection Chips */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
                <Tag className="h-4 w-4 text-[#7C5CFF]" />
                <span>3. Selected Skills to Assess</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#9B7CFF] bg-[#1B243B] border border-[#26304A] px-2 py-0.5 rounded">
                {config.selectedSkills.length} selected
              </span>
            </div>

            {/* Active Selected Skills Chips */}
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2.5 rounded-xl bg-[#11182B] border border-[#26304A]">
              {config.selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B243B] border border-[#26304A] px-2.5 py-1 text-xs font-semibold text-[#F5F7FF]"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleToggleSkill(skill)}
                    className="rounded-full hover:bg-[#26304A] p-0.5 text-[#AAB4CC] hover:text-[#F5F7FF]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {config.selectedSkills.length === 0 && (
                <span className="text-xs text-[#737E98] italic flex items-center px-2">
                  No skills selected yet. Choose from suggestions below or add your own.
                </span>
              )}
            </div>

            {/* Add Custom Skill Form */}
            <form onSubmit={handleAddCustomSkill} className="flex gap-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={e => setCustomSkillInput(e.target.value)}
                placeholder="Add custom skill (e.g. Apache Flink, WebRTC, GraphQL)..."
                className="flex-1 rounded-xl border border-[#26304A] bg-[#11182B] px-3.5 py-2 text-xs text-[#F5F7FF] placeholder-[#737E98] focus:border-[#7C5CFF] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-[#1B243B] hover:bg-[#26304A] px-3.5 py-2 text-xs font-bold text-[#F5F7FF] border border-[#26304A] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Suggested Skills Pill Pool */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#737E98] uppercase tracking-wider">
                Suggested Competencies:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_SKILL_SUGGESTIONS.map(s => {
                  const isSelected = config.selectedSkills.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => handleToggleSkill(s)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                          : 'bg-[#11182B] text-[#AAB4CC] border border-[#26304A] hover:bg-[#1B243B] hover:text-[#F5F7FF]'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Difficulty & Duration Selection */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
              <Gauge className="h-4 w-4 text-[#7C5CFF]" />
              <span>4. Difficulty & Duration</span>
            </div>

            {/* Difficulty Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Beginner */}
              <div
                onClick={() => setConfig({ ...config, difficulty: 'beginner' })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  config.difficulty === 'beginner'
                    ? 'border-[#7C5CFF] bg-[#1B243B] text-[#F5F7FF] shadow-sm ring-1 ring-[#7C5CFF]'
                    : 'border-[#26304A] bg-[#11182B] text-[#AAB4CC] hover:border-[#7C5CFF]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#F5F7FF]">Beginner</span>
                  {config.difficulty === 'beginner' && (
                    <CheckCircle className="h-3.5 w-3.5 text-[#7C5CFF]" />
                  )}
                </div>
                <p className="text-[11px] leading-tight text-[#737E98]">
                  Fundamental concepts, standard algorithms, guided hints.
                </p>
              </div>

              {/* Adaptive (Recommended) */}
              <div
                onClick={() => setConfig({ ...config, difficulty: 'adaptive' })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all relative ${
                  config.difficulty === 'adaptive'
                    ? 'border-[#7C5CFF] bg-[#1B243B] text-[#F5F7FF] shadow-sm ring-2 ring-[#7C5CFF]'
                    : 'border-[#26304A] bg-[#11182B] text-[#AAB4CC] hover:border-[#7C5CFF]/40'
                }`}
              >
                <span className="absolute -top-2 right-2 rounded-full bg-[#B8F34A] border border-[#0B1020] px-1.5 py-0.2 text-[9px] font-extrabold text-[#0B1020] uppercase tracking-wider">
                  Adaptive
                </span>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#9B7CFF]">Dynamic AI</span>
                  {config.difficulty === 'adaptive' && (
                    <CheckCircle className="h-3.5 w-3.5 text-[#7C5CFF]" />
                  )}
                </div>
                <p className="text-[11px] leading-tight text-[#737E98]">
                  Auto-adjusts question complexity based on your answers.
                </p>
              </div>

              {/* Advanced */}
              <div
                onClick={() => setConfig({ ...config, difficulty: 'advanced' })}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  config.difficulty === 'advanced'
                    ? 'border-[#7C5CFF] bg-[#1B243B] text-[#F5F7FF] shadow-sm ring-1 ring-[#7C5CFF]'
                    : 'border-[#26304A] bg-[#11182B] text-[#AAB4CC] hover:border-[#7C5CFF]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#F5F7FF]">Advanced</span>
                  {config.difficulty === 'advanced' && (
                    <CheckCircle className="h-3.5 w-3.5 text-[#7C5CFF]" />
                  )}
                </div>
                <p className="text-[11px] leading-tight text-[#737E98]">
                  Staff-level edge cases, deep concurrency, chaos failures.
                </p>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="pt-2">
              <label className="text-xs font-bold text-[#AAB4CC] mb-2 block">
                Target Interview Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([15, 30, 45, 60] as InterviewDuration[]).map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setConfig({ ...config, duration: dur })}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                      config.duration === dur
                        ? 'border-[#7C5CFF] bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                        : 'border-[#26304A] bg-[#11182B] text-[#AAB4CC] hover:bg-[#1B243B] hover:text-[#F5F7FF]'
                    }`}
                  >
                    {dur} Mins
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interview Preview & Readiness Check (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Structure Preview Card */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#26304A] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
                <Layers className="h-4 w-4 text-[#7C5CFF]" />
                <span>Structure Preview</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#9B7CFF] bg-[#1B243B] px-2 py-0.5 rounded border border-[#26304A]">
                {config.duration}m Total
              </span>
            </div>

            {/* Timeline Breakdown */}
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#26304A]">
              {/* Step 1 */}
              <div className="relative flex items-start gap-3 pl-7">
                <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-[#7C5CFF] bg-[#151D32]" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F7FF]">1. Technical Context & Overview</span>
                    <span className="text-[10px] text-[#737E98] font-mono">10% (~3m)</span>
                  </div>
                  <p className="text-[11px] text-[#AAB4CC]">
                    Background, previous high-scale projects & architecture philosophies.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-3 pl-7">
                <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-[#7C5CFF] bg-[#151D32]" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F7FF]">2. Core System Design & Scenario</span>
                    <span className="text-[10px] text-[#737E98] font-mono">40% (~12m)</span>
                  </div>
                  <p className="text-[11px] text-[#AAB4CC]">
                    {config.selectedSkills.length > 0
                      ? `Architectural design, component trade-offs, and scaling ${config.selectedSkills.slice(0, 2).join(' & ')}.`
                      : `Architectural design and core system trade-offs for ${config.targetRole}.`}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-start gap-3 pl-7">
                <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-[#7C5CFF] bg-[#151D32]" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F7FF]">3. Adaptive Concurrency Deep-Dive</span>
                    <span className="text-[10px] text-[#737E98] font-mono">35% (~10m)</span>
                  </div>
                  <p className="text-[11px] text-[#AAB4CC]">
                    {config.selectedSkills.length > 2
                      ? `Probing edge cases, failure recovery, and bottlenecks in ${config.selectedSkills.slice(2, 4).join(' & ')}.`
                      : `Live edge cases, concurrency trade-offs, and high-load stress testing.`}
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-start gap-3 pl-7">
                <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-[#7C5CFF] bg-[#151D32]" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F7FF]">4. Trade-off Synthesis & Wrap-up</span>
                    <span className="text-[10px] text-[#737E98] font-mono">15% (~5m)</span>
                  </div>
                  <p className="text-[11px] text-[#AAB4CC]">
                    CAP theorem balance, observability tracing, and Q&A session.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AV Telemetry Pre-Check Placeholder */}
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#AAB4CC]">
                Media & Hardware Readiness
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#B8F34A]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#B8F34A] border border-[#B8F34A]/30">
                <ShieldCheck className="h-3 w-3" /> Ready
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-[#11182B] border border-[#26304A] p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF]">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F7FF]">HD Webcam</div>
                  <div className="text-[10px] text-[#737E98]">1080p 60fps • Good</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-[#11182B] border border-[#26304A] p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B243B] text-[#7C5CFF]">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F7FF]">Microphone</div>
                  <div className="text-[10px] text-[#737E98]">Level: -14 dB (Optimal)</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#11182B] border border-[#26304A] p-3 text-[11px] text-[#AAB4CC] flex items-center gap-2">
              <Info className="h-4 w-4 text-[#7C5CFF] shrink-0" />
              <span>Camera and microphone signals are securely processed with zero latency overhead.</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            disabled={isGenerating || config.selectedSkills.length === 0}
            onClick={handleStartGeneration}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFF] py-4 text-sm font-bold text-[#F5F7FF] shadow-lg shadow-[#7C5CFF]/20 hover:bg-[#9B7CFF] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-[#F5F7FF] text-[#F5F7FF]" />
            <span>Launch Live AI Interview Session</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
