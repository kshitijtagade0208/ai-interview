'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { InterviewEvaluation } from '../types/interview';
import { getScoreBadgeStyle, getScoreLabel } from '../lib/evaluation/scoring';

interface InterviewResultsProps {
  evaluation: InterviewEvaluation;
  onRetake: () => void;
  onBackToDashboard: () => void;
}

export const InterviewResults: React.FC<InterviewResultsProps> = ({
  evaluation,
  onRetake,
  onBackToDashboard
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'evidence' | 'jd-match'>('overview');

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Top Banner: Executive Evaluation Result Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[#26304A] bg-[#151D32] p-6 sm:p-8 shadow-xl">
        {/* Subtle pattern */}
        <div className="pointer-events-none absolute inset-0 bg-dark-grid opacity-20" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-[#B8F34A]/30 bg-[#B8F34A]/10 px-3 py-1 text-xs font-bold text-[#B8F34A]">
                <span className="h-2 w-2 rounded-full bg-[#B8F34A]" />
                <span>Evaluation Complete</span>
              </span>
              <span className="text-xs text-[#737E98] font-mono">{evaluation.date}</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#F5F7FF] tracking-tight">
                Candidate Assessment Report
              </h1>
              <p className="text-xs sm:text-sm text-[#AAB4CC] mt-1 font-medium">
                Target Role: <strong className="text-[#F5F7FF]">{evaluation.role}</strong> at <span className="text-[#9B7CFF] font-bold">{evaluation.company}</span>
              </p>
            </div>
          </div>

          {/* Verdict & Score Highlight */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Score Block */}
            <div className="rounded-2xl border border-[#26304A] bg-[#11182B] p-4 text-center min-w-[140px] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#737E98] block mb-1">
                Overall Score
              </span>
              <div className="flex items-baseline justify-center gap-1 font-mono">
                <span className="text-4xl font-extrabold text-[#F5F7FF]">{evaluation.overallScore}</span>
                <span className="text-sm text-[#737E98]">/100</span>
              </div>
              {evaluation.percentile >= 75 ? (
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[#B8F34A]">
                  <TrendingUp className="h-3 w-3 text-[#B8F34A]" /> Top {100 - evaluation.percentile}% (P{evaluation.percentile})
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[#AAB4CC]">
                  <span>Benchmark: P{evaluation.percentile}</span>
                </div>
              )}
            </div>

            {/* Verdict Badge Block */}
            {(() => {
              const verdictColors = 
                evaluation.verdict === 'Strong Hire'
                  ? { border: 'border-[#B8F34A]/50', text: 'text-[#B8F34A]', label: 'text-[#B8F34A]' }
                  : evaluation.verdict === 'Hire'
                  ? { border: 'border-[#7C5CFF]', text: 'text-[#F5F7FF]', label: 'text-[#9B7CFF]' }
                  : evaluation.verdict === 'Lean Hire'
                  ? { border: 'border-[#38BDF8]/50', text: 'text-[#38BDF8]', label: 'text-[#38BDF8]' }
                  : { border: 'border-[#F5C451]/60', text: 'text-[#F5C451]', label: 'text-[#F5C451]' };

              return (
                <div className={`rounded-2xl border ${verdictColors.border} bg-[#1B243B] p-4 text-center min-w-[140px] shadow-lg`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${verdictColors.label} block mb-1`}>
                    Recommendation
                  </span>
                  <span className={`text-2xl font-black tracking-tight block ${verdictColors.text}`}>
                    {evaluation.verdict}
                  </span>
                  <span className="text-[10px] text-[#AAB4CC] font-medium">Standard Rubric Calibration</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#26304A] pt-5 mt-6">
          {/* Navigation Sub-tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#11182B] p-1 border border-[#26304A]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                  : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'skills'
                  ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                  : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
              }`}
            >
              Skill Scorecards ({evaluation.skills.length})
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'evidence'
                  ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                  : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
              }`}
            >
              Question Evidence ({evaluation.questionResults.length})
            </button>
            <button
              onClick={() => setActiveTab('jd-match')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'jd-match'
                  ? 'bg-[#7C5CFF] text-[#F5F7FF] shadow-sm'
                  : 'text-[#AAB4CC] hover:text-[#F5F7FF]'
              }`}
            >
              JD Alignment ({evaluation.jdAlignmentScore}%)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#26304A] bg-[#1B243B] px-3.5 py-2 text-xs font-bold text-[#F5F7FF] hover:bg-[#26304A] transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake Drill</span>
            </button>

            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFF] px-4 py-2 text-xs font-bold text-[#F5F7FF] shadow-md shadow-[#7C5CFF]/20 hover:bg-[#9B7CFF]"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Soft Skills & Behavioral Telemetry Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(() => {
          const techStyle = getScoreBadgeStyle(evaluation.technicalDepthScore);
          return (
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm">
              <div className="text-xs font-bold text-[#AAB4CC] mb-1">Technical Depth</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#F5F7FF] font-mono">{evaluation.technicalDepthScore}%</span>
                <span className={`text-[10px] font-bold ${techStyle.textColor} ${techStyle.bgColor} px-1.5 py-0.5 rounded border ${techStyle.borderColor}`}>
                  {techStyle.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#11182B] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${evaluation.technicalDepthScore}%` }} />
              </div>
            </div>
          );
        })()}

        {(() => {
          const commStyle = getScoreBadgeStyle(evaluation.communicationScore);
          return (
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm">
              <div className="text-xs font-bold text-[#AAB4CC] mb-1">Communication Clarity</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#F5F7FF] font-mono">{evaluation.communicationScore}%</span>
                <span className={`text-[10px] font-bold ${commStyle.textColor} ${commStyle.bgColor} px-1.5 py-0.5 rounded border ${commStyle.borderColor}`}>
                  {commStyle.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#11182B] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${evaluation.communicationScore}%` }} />
              </div>
            </div>
          );
        })()}

        {(() => {
          const psStyle = getScoreBadgeStyle(evaluation.problemSolvingScore);
          return (
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm">
              <div className="text-xs font-bold text-[#AAB4CC] mb-1">Problem Solving</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#F5F7FF] font-mono">{evaluation.problemSolvingScore}%</span>
                <span className={`text-[10px] font-bold ${psStyle.textColor} ${psStyle.bgColor} px-1.5 py-0.5 rounded border ${psStyle.borderColor}`}>
                  {psStyle.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#11182B] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${evaluation.problemSolvingScore}%` }} />
              </div>
            </div>
          );
        })()}

        {(() => {
          const structStyle = getScoreBadgeStyle(evaluation.structureScore);
          return (
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-4 shadow-sm">
              <div className="text-xs font-bold text-[#AAB4CC] mb-1">Structure & Trade-offs</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#F5F7FF] font-mono">{evaluation.structureScore}%</span>
                <span className={`text-[10px] font-bold ${structStyle.textColor} ${structStyle.bgColor} px-1.5 py-0.5 rounded border ${structStyle.borderColor}`}>
                  {structStyle.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#11182B] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${evaluation.structureScore}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tab 1: Executive Overview (Strengths vs Improvement Areas) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* AI Evaluator Synthesis Box */}
          <div className="rounded-2xl border border-[#26304A] bg-[#11182B] p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
              <Sparkles className="h-4 w-4 text-[#7C5CFF]" />
              <span>AI Lead Evaluator Synthesis</span>
            </div>
            <p className="text-xs sm:text-sm text-[#AAB4CC] leading-relaxed font-medium">
              {evaluation.summary}
            </p>
          </div>

          {/* Strengths & Areas to Improve Split Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Key Strengths */}
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B8F34A]/20 text-[#B8F34A] text-xs font-extrabold border border-[#B8F34A]/30">
                  ✓
                </span>
                <span>Demonstrated Key Strengths</span>
              </div>
              <ul className="space-y-2.5">
                {evaluation.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#F5F7FF] font-medium">
                    <span className="text-[#B8F34A] font-bold mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5C451]">
                <AlertTriangle className="h-5 w-5 text-[#F5C451]" />
                <span>Actionable Areas to Improve</span>
              </div>
              <ul className="space-y-2.5">
                {evaluation.areasToImprove.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#AAB4CC] font-medium">
                    <span className="text-[#F5C451] font-bold mt-0.5">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Skill-by-Skill Assessment Cards */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#F5F7FF] tracking-tight flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#7C5CFF]" />
              <span>Skill-by-Skill Rubric Breakdown</span>
            </h2>
            <span className="text-xs text-[#737E98]">Evaluated against Staff Engineer standards</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {evaluation.skills.map((skill, idx) => {
              const skillBadge = getScoreBadgeStyle(skill.score);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#26304A] bg-[#151D32] p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#737E98] font-bold">
                        {skill.category}
                      </span>
                      <h3 className="text-sm font-bold text-[#F5F7FF] mt-0.5">{skill.skill}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className={`text-[10px] font-bold ${skillBadge.textColor} ${skillBadge.bgColor} px-2 py-0.5 rounded border ${skillBadge.borderColor}`}>
                        {skillBadge.label}
                      </span>
                      <span className="font-mono text-base font-extrabold text-[#F5F7FF]">
                        {skill.score}%
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-[#11182B] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7C5CFF]"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#AAB4CC] leading-relaxed pt-1 font-medium">
                    {skill.feedback}
                  </p>

                  {/* Micro tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skill.strengths.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="rounded bg-[#1B243B] border border-[#26304A] px-2 py-0.5 text-[10px] font-bold text-[#9B7CFF]"
                      >
                        + {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Evidence from Answers */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F5F7FF] tracking-tight flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#7C5CFF]" />
                <span>Question-by-Question Answer Evidence</span>
              </h2>
              <p className="text-xs text-[#737E98]">
                Detailed audit of candidate answers, key points verified, and evaluator notes.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {evaluation.questionResults.map(q => {
              const isExpanded = expandedQuestion === q.questionNumber;
              const qBadge = getScoreBadgeStyle(q.score);
              return (
                <div
                  key={q.questionNumber}
                  className="rounded-2xl border border-[#26304A] bg-[#151D32] overflow-hidden shadow-sm transition-all"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.questionNumber)}
                    className="flex cursor-pointer items-center justify-between p-4 hover:bg-[#1B243B]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B243B] text-[#9B7CFF] border border-[#26304A] text-xs font-bold font-mono">
                        Q{q.questionNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-[#F5F7FF]">
                            {q.topic}
                          </h3>
                          <span className="rounded bg-[#11182B] px-1.5 py-0.2 text-[10px] text-[#9B7CFF] font-mono font-bold border border-[#26304A]">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#AAB4CC] line-clamp-1 mt-0.5 font-medium">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={`text-[10px] font-bold ${qBadge.textColor} ${qBadge.bgColor} px-2 py-0.5 rounded border ${qBadge.borderColor}`}>
                        {qBadge.label}
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#F5F7FF] bg-[#1B243B] border border-[#26304A] px-2.5 py-1 rounded-lg">
                        {q.score}/100
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-[#737E98]" /> : <ChevronDown className="h-4 w-4 text-[#737E98]" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-[#26304A] bg-[#11182B] p-5 space-y-4 text-xs sm:text-sm">
                      {/* Candidate Answer Evidence & Evaluator Summary */}
                      <div className="space-y-3">
                        {q.rawAnswer && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737E98] block mb-1">
                              Candidate Submitted Answer / Transcript
                            </span>
                            <div className="rounded-xl bg-[#151D32] border border-[#26304A] p-3 text-[#F5F7FF] leading-relaxed font-mono text-xs whitespace-pre-wrap">
                              {q.rawAnswer}
                            </div>
                          </div>
                        )}

                        {q.candidateSummary && q.candidateSummary !== q.rawAnswer && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737E98] block mb-1">
                              Evaluator Answer Summary
                            </span>
                            <p className="rounded-xl bg-[#151D32] border border-[#26304A] p-3 text-[#F5F7FF] leading-relaxed italic font-medium">
                              &quot;{q.candidateSummary}&quot;
                            </p>
                          </div>
                        )}

                        {!q.rawAnswer && q.candidateSummary && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737E98] block mb-1">
                              Evaluator Response Summary
                            </span>
                            <p className="rounded-xl bg-[#151D32] border border-[#26304A] p-3 text-[#F5F7FF] leading-relaxed italic font-medium">
                              &quot;{q.candidateSummary}&quot;
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Demonstrated Key Points */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5F7FF]">
                            Key Points Demonstrated
                          </span>
                          <ul className="space-y-1 text-[#F5F7FF] text-xs font-medium">
                            {q.keyPointsDemonstrated.map((kp, kIdx) => (
                              <li key={kIdx} className="flex items-start gap-1.5">
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#B8F34A]/20 text-[#B8F34A] text-[9px] font-extrabold border border-[#B8F34A]/40 mt-0.5">
                                  ✓
                                </span>
                                <span>{kp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Missed Opportunities / Gaps */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5C451]">
                            Missed Opportunities / Gaps
                          </span>
                          <ul className="space-y-1 text-[#AAB4CC] text-xs font-medium">
                            {q.missedOpportunities.map((mo, mIdx) => (
                              <li key={mIdx} className="flex items-start gap-1.5">
                                <span className="text-[#F5C451] font-bold">•</span>
                                <span>{mo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Evaluator Internal Note */}
                      <div className="rounded-xl bg-[#151D32] border border-[#26304A] p-3 text-xs text-[#F5F7FF] flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-[#7C5CFF] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#9B7CFF]">Evaluator Note:</strong> {q.aiNote}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: JD Alignment Section */}
      {activeTab === 'jd-match' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#26304A] bg-[#151D32] p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
                  <Target className="h-5 w-5 text-[#7C5CFF]" />
                  <span>Target Role Competency Alignment</span>
                </div>
                <p className="text-xs text-[#AAB4CC] mt-0.5 font-medium">
                  Comparison against the provided Job Description for {evaluation.role} at {evaluation.company}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-[#7C5CFF] font-mono">
                  {evaluation.jdAlignmentScore}%
                </span>
                <span className="text-xs font-bold text-[#F5F7FF]">Match Index</span>
              </div>
            </div>

            {/* Matched Requirements List */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F5F7FF]">
                Directly Validated Competencies
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {evaluation.matchedRequirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl bg-[#11182B] border border-[#26304A] px-3 py-2 text-xs font-bold text-[#F5F7FF]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B8F34A]/20 text-[#B8F34A] text-[9px] font-extrabold border border-[#B8F34A]/40">
                      ✓
                    </span>
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Unverified / Minor Gaps */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#737E98]">
                Unverified / Secondary Competencies
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {evaluation.missingCompetencies.map((gap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl bg-[#11182B] border border-[#26304A] px-3 py-2 text-xs text-[#737E98] font-medium"
                  >
                    <AlertTriangle className="h-4 w-4 text-[#F5C451] shrink-0" />
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
