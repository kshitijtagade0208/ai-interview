'use client';

import { useState, useCallback, useRef } from 'react';
import {
  InterviewConfig,
  InterviewSessionState,
  QuestionData,
  InterviewEvaluation,
  CandidateResponse,
  EvaluationEvidence,
  AdaptiveDecision
} from '../types/interview';
import {
  DEFAULT_CONFIG,
  MOCK_INTERVIEW_QUESTIONS,
  MOCK_EVALUATION_DATA,
  generateDynamicFallbackQuestions
} from '../data/mockData';
import {
  calculateOverallScore,
  getVerdictFromScore,
  calculatePercentile,
  parseScore,
  resolveEffectiveAnswer
} from '../lib/evaluation/scoring';
import { generateHeuristicEvaluation } from '../lib/ai/adaptiveEngine';

export interface UseInterviewSessionReturn {
  session: InterviewSessionState;
  startInterview: (config: InterviewConfig) => Promise<void>;
  setCurrentQuestion: (question: QuestionData) => void;
  submitAnswer: (answer: string, notes?: string) => Promise<EvaluationEvidence | null>;
  setEvaluation: (evaluation: InterviewEvaluation) => void;
  advanceToNextQuestion: () => Promise<void>;
  goToPreviousQuestion: () => void;
  completeInterview: () => Promise<void>;
  resetInterview: () => void;
  // Computed helpers
  isConfiguring: boolean;
  isGenerating: boolean;
  isReady: boolean;
  isLive: boolean;
  isEvaluating: boolean;
  isCompleted: boolean;
  totalQuestions: number;
  currentQuestionNumber: number;
  hasMoreQuestions: boolean;
  skillsTested: string[];
}

const INITIAL_SESSION_STATE: InterviewSessionState = {
  status: 'CONFIGURING',
  config: DEFAULT_CONFIG,
  questions: MOCK_INTERVIEW_QUESTIONS,
  currentQuestionIndex: 0,
  currentQuestion: MOCK_INTERVIEW_QUESTIONS[0] || null,
  currentSkill: DEFAULT_CONFIG.selectedSkills[0] || 'Retrieval-Augmented Generation (RAG)',
  currentDifficulty: DEFAULT_CONFIG.difficulty,
  responses: [],
  evidences: [],
  evaluation: null,
  startedAt: null,
  completedAt: null
};

export function useInterviewSession(): UseInterviewSessionReturn {
  const [session, setSession] = useState<InterviewSessionState>(INITIAL_SESSION_STATE);
  const isSubmittingAnswerRef = useRef(false);
  const isCompletingInterviewRef = useRef(false);
  const isGeneratingSyllabusRef = useRef(false);

  /**
   * Start the interview session by calling /api/interview/generate-syllabus
   * or falling back gracefully to dynamically calibrated questions.
   */
  const startInterview = useCallback(async (config: InterviewConfig) => {
    if (isGeneratingSyllabusRef.current) return;
    isGeneratingSyllabusRef.current = true;
    // Immediately build dynamic role-aligned questions so state is clean from millisecond 0
    const immediateInitialQuestions = generateDynamicFallbackQuestions(
      config.targetRole,
      config.selectedSkills,
      config.difficulty,
      config.jobDescription
    );
    const initialFirstQ = immediateInitialQuestions[0] || null;

    setSession({
      status: 'GENERATING',
      config,
      questions: immediateInitialQuestions,
      currentQuestionIndex: 0,
      currentQuestion: initialFirstQ,
      currentSkill: initialFirstQ?.topic || config.selectedSkills[0] || 'AI Engineering',
      currentDifficulty: initialFirstQ?.difficulty || config.difficulty,
      responses: [],
      evidences: [],
      evaluation: null,
      startedAt: new Date().toISOString(),
      completedAt: null
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[InterviewAI Session Start REQUEST]', {
        role: config.targetRole,
        selectedSkills: config.selectedSkills,
        jobDescription: config.jobDescription || '(none provided)',
        difficulty: config.difficulty,
        duration: config.duration
      });
    }

    try {
      const res = await fetch('/api/interview/generate-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: config.targetRole,
          jobDescription: config.jobDescription,
          skills: config.selectedSkills,
          difficulty: config.difficulty,
          duration: config.duration
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.questions?.length) {
          const generatedQuestions: QuestionData[] = data.questions;
          const firstQ = generatedQuestions[0];

          if (process.env.NODE_ENV !== 'production') {
            console.log('[InterviewAI Session Start RESPONSE]', {
              count: generatedQuestions.length,
              generatedQuestionTopic: firstQ?.topic,
              questionText: firstQ?.question,
              sourceProvider: 'Groq / LLM'
            });
          }

          setSession({
            status: 'LIVE',
            config,
            questions: generatedQuestions,
            currentQuestionIndex: 0,
            currentQuestion: firstQ,
            currentSkill: firstQ?.topic || config.selectedSkills[0] || 'AI Engineering',
            currentDifficulty: firstQ?.difficulty || config.difficulty,
            responses: [],
            evidences: [],
            evaluation: null,
            startedAt: new Date().toISOString(),
            completedAt: null
          });
          return;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[InterviewAI Session] Network/server error during syllabus generation, using dynamic fallback:', err);
      }
    } finally {
      isGeneratingSyllabusRef.current = false;
    }

    // Fallback: activate the role-calibrated dynamic questions
    if (process.env.NODE_ENV !== 'production') {
      console.log('[InterviewAI Session Start RESPONSE]', {
        count: immediateInitialQuestions.length,
        generatedQuestionTopic: initialFirstQ?.topic,
        questionText: initialFirstQ?.question,
        sourceProvider: 'Dynamic Role-Calibrated Generator'
      });
    }

    setSession({
      status: 'LIVE',
      config,
      questions: immediateInitialQuestions,
      currentQuestionIndex: 0,
      currentQuestion: initialFirstQ,
      currentSkill: initialFirstQ?.topic || config.selectedSkills[0] || 'AI Engineering',
      currentDifficulty: initialFirstQ?.difficulty || config.difficulty,
      responses: [],
      evidences: [],
      evaluation: null,
      startedAt: new Date().toISOString(),
      completedAt: null
    });
  }, []);

  /**
   * Manually set the active question.
   */
  const setCurrentQuestion = useCallback((question: QuestionData) => {
    setSession(prev => {
      const idx = prev.questions.findIndex(q => q.id === question.id);
      return {
        ...prev,
        currentQuestion: question,
        currentQuestionIndex: idx !== -1 ? idx : prev.currentQuestionIndex,
        currentSkill: question.topic
      };
    });
  }, []);

  /**
   * Submit the candidate's answer for real-time evaluation via /api/interview/evaluate-answer.
   */
  const submitAnswer = useCallback(async (answer: string, notes?: string): Promise<EvaluationEvidence | null> => {
    if (!session.currentQuestion || isSubmittingAnswerRef.current) return null;
    isSubmittingAnswerRef.current = true;

    const currentQ = session.currentQuestion;
    const timestamp = new Date().toISOString();

    const trimmedNotes = notes?.trim() || '';
    const trimmedAnswer = answer?.trim() || '';

    // Cleanly resolve effective answer preserving real content and eliminating duplicate identical strings
    const effectiveAnswer = resolveEffectiveAnswer(trimmedAnswer, trimmedNotes);

    const newResponse: CandidateResponse = {
      questionId: currentQ.id,
      question: currentQ.question,
      answer: effectiveAnswer,
      notes: trimmedNotes || undefined,
      skill: currentQ.topic,
      timestamp,
      questionDifficulty: currentQ.difficulty
    };

    setSession(prev => {
      const existingIdx = prev.responses.findIndex(r => r.questionId === currentQ.id);
      const updatedResponses = existingIdx >= 0
        ? prev.responses.map((r, i) => (i === existingIdx ? newResponse : r))
        : [...prev.responses, newResponse];
      return {
        ...prev,
        status: 'EVALUATING',
        responses: updatedResponses
      };
    });

    // Assemble chronological conversation history for multi-turn conversational context
    const conversationHistory: Array<{ role: 'interviewer' | 'candidate'; content: string; topic?: string }> = [];
    session.responses.forEach((r, idx) => {
      const q = session.questions[idx];
      if (q) {
        conversationHistory.push({
          role: 'interviewer',
          content: q.conversationalResponse || q.question,
          topic: q.topic
        });
      }
      conversationHistory.push({ role: 'candidate', content: r.answer, topic: r.skill });
    });

    try {
      const res = await fetch('/api/interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.conversationalResponse || currentQ.question,
          candidateAnswer: effectiveAnswer,
          skill: currentQ.topic,
          jobDescription: session.config.jobDescription,
          expectedEvidence: currentQ.expectedKeyPoints,
          currentDifficulty: currentQ.difficulty,
          questionData: currentQ,
          conversationHistory
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const newEvidence: EvaluationEvidence = {
            questionId: currentQ.id,
            score: parseScore(data.score, 0),
            demonstratedKnowledge: data.demonstratedKnowledge || currentQ.expectedKeyPoints.slice(0, 2),
            missingKnowledge: data.missingKnowledge || currentQ.expectedKeyPoints.slice(2),
            strengths: data.strengths || ['Solid architectural reasoning'],
            weaknesses: data.weaknesses || ['Could detail deep failure modes'],
            confidence: typeof data.confidence === 'number' ? data.confidence : 0.92,
            followUpRecommendation: data.reasoning || data.nextQuestion || 'Continue probing',
            adaptiveDecision: (data.decision as AdaptiveDecision) || 'continue_current_topic',
            conversationalResponse: data.conversationalResponse
          };

          setSession(prev => {
            const updatedQuestions = [...prev.questions];
            const nextIdx = prev.currentQuestionIndex + 1;

            if (data.nextQuestion) {
              const nextQuestionItem: QuestionData = {
                id: nextIdx < updatedQuestions.length ? updatedQuestions[nextIdx].id : nextIdx + 1,
                title: `Follow-up: ${currentQ.topic}`,
                topic: currentQ.topic,
                difficulty: data.nextDifficulty || currentQ.difficulty,
                timeLimitSeconds: 300,
                question: data.nextQuestion,
                hints: [`Focus on practical trade-offs for ${currentQ.topic}`, 'Address edge cases and failure modes'],
                expectedKeyPoints: [
                  `Direct resolution of ${currentQ.topic} scenario`,
                  'Concrete engineering rationale',
                  'Trade-off and reliability considerations'
                ],
                conversationalResponse: data.conversationalResponse
              };

              if (nextIdx < updatedQuestions.length) {
                updatedQuestions[nextIdx] = nextQuestionItem;
              } else {
                updatedQuestions.push(nextQuestionItem);
              }
            }

            const existingEvIdx = prev.evidences.findIndex(e => e.questionId === currentQ.id);
            const updatedEvidences = existingEvIdx >= 0
              ? prev.evidences.map((e, i) => (i === existingEvIdx ? newEvidence : e))
              : [...prev.evidences, newEvidence];

            return {
              ...prev,
              status: 'LIVE',
              questions: updatedQuestions,
              evidences: updatedEvidences
            };
          });
          return newEvidence;
        }
      }
    } catch {
      // Continue with heuristic evaluation fallback
    } finally {
      isSubmittingAnswerRef.current = false;
    }

    // Heuristic fallback evidence computed from candidate's actual answer and question criteria
    const fallbackEval = generateHeuristicEvaluation(
      currentQ,
      effectiveAnswer,
      currentQ.difficulty
    );

    const fallbackEvidence: EvaluationEvidence = {
      questionId: currentQ.id,
      score: parseScore(fallbackEval.score, 0),
      demonstratedKnowledge: fallbackEval.demonstratedKnowledge,
      missingKnowledge: fallbackEval.missingKnowledge,
      strengths: fallbackEval.strengths,
      weaknesses: fallbackEval.weaknesses,
      confidence: fallbackEval.confidence,
      followUpRecommendation: fallbackEval.reasoning || fallbackEval.nextQuestion,
      adaptiveDecision: fallbackEval.decision,
      conversationalResponse: fallbackEval.conversationalResponse
    };

    setSession(prev => {
      const updatedQuestions = [...prev.questions];
      const nextIdx = prev.currentQuestionIndex + 1;

      if (fallbackEval.nextQuestion) {
        const nextQuestionItem: QuestionData = {
          id: nextIdx < updatedQuestions.length ? updatedQuestions[nextIdx].id : nextIdx + 1,
          title: `Follow-up: ${currentQ.topic}`,
          topic: currentQ.topic,
          difficulty: fallbackEval.nextDifficulty || currentQ.difficulty,
          timeLimitSeconds: 300,
          question: fallbackEval.nextQuestion,
          hints: [`Focus on trade-offs specific to ${currentQ.topic}`, 'Address edge cases and failure modes'],
          expectedKeyPoints: [
            `Clear resolution of ${currentQ.topic} edge case`,
            'Concrete architectural mechanism',
            'Trade-off and reliability considerations'
          ],
          conversationalResponse: fallbackEval.conversationalResponse
        };

        if (nextIdx < updatedQuestions.length) {
          updatedQuestions[nextIdx] = nextQuestionItem;
        } else {
          updatedQuestions.push(nextQuestionItem);
        }
      }

      const existingEvIdx = prev.evidences.findIndex(e => e.questionId === currentQ.id);
      const updatedEvidences = existingEvIdx >= 0
        ? prev.evidences.map((e, i) => (i === existingEvIdx ? fallbackEvidence : e))
        : [...prev.evidences, fallbackEvidence];
      return {
        ...prev,
        status: 'LIVE',
        questions: updatedQuestions,
        evidences: updatedEvidences
      };
    });
    return fallbackEvidence;
  }, [session.currentQuestion, session.config.jobDescription, session.responses, session.questions]);

  /**
   * Finalize the interview session and generate the comprehensive assessment report via /api/interview/generate-report.
   */
  const completeInterview = useCallback(async () => {
    if (isCompletingInterviewRef.current) return;
    isCompletingInterviewRef.current = true;

    setSession(prev => ({
      ...prev,
      status: 'EVALUATING'
    }));

    const completedAt = new Date().toISOString();

    try {
      const res = await fetch('/api/interview/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: session.config.targetRole,
          company: session.config.companyName || 'Target Organization',
          jobDescription: session.config.jobDescription,
          skills: session.config.selectedSkills,
          questions: session.questions,
          responses: session.responses,
          evidences: session.evidences
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.evaluation) {
          setSession(prev => ({
            ...prev,
            status: 'COMPLETED',
            completedAt,
            evaluation: data.evaluation
          }));
          return;
        }
      }
    } catch {
      // Fallback synthesis
    } finally {
      isCompletingInterviewRef.current = false;
    }

    const questionScores = session.responses.map(r => {
      const ev = session.evidences.find(e => e.questionId === r.questionId);
      return ev?.score !== undefined ? parseScore(ev.score, 0) : 0;
    });

    const calculatedOverall = calculateOverallScore(
      questionScores.length ? questionScores : [0]
    );
    const fallbackVerdict = getVerdictFromScore(calculatedOverall);
    const fallbackPercentile = calculatePercentile(calculatedOverall);

    const fallbackSkills = session.config.selectedSkills.map((skillName, idx) => {
      const matchingScore = questionScores[idx % questionScores.length] ?? calculatedOverall;
      return {
        skill: skillName,
        score: matchingScore,
        category: idx === 0 ? 'Core Domain' : 'Architecture & Reliability',
        feedback: matchingScore >= 75
          ? `Demonstrated clear reasoning and solid practical foundation in ${skillName}.`
          : `Needs deeper practical exposure to trade-offs and error handling in ${skillName}.`,
        strengths: matchingScore >= 75
          ? ['Trade-off awareness', 'System-level reasoning']
          : ['Identified relevant terminology'],
        gaps: matchingScore >= 75
          ? ['Downstream resilience edge cases']
          : ['Lacks concrete implementation parameters and failure recovery']
      };
    });

    const synthesizedReport: InterviewEvaluation = {
      id: `eval-${Date.now()}`,
      role: session.config.targetRole,
      company: session.config.companyName || 'Target Organization',
      date: 'Just now',
      overallScore: calculatedOverall,
      verdict: fallbackVerdict,
      percentile: fallbackPercentile,
      jdAlignmentScore: Math.min(98, Math.max(20, Math.round(calculatedOverall * 0.95))),
      summary: calculatedOverall >= 80
        ? `Candidate demonstrated strong technical competency across questions, articulating practical tradeoffs and architecture mechanics.`
        : calculatedOverall >= 60
        ? `Candidate showed satisfactory foundational knowledge but missed opportunities on failure modes and scaling tradeoffs.`
        : `Candidate showed significant technical gaps and struggled to explain core architectural mechanisms and recovery patterns.`,
      matchedRequirements: calculatedOverall >= 60 ? session.config.selectedSkills : session.config.selectedSkills.slice(0, 1),
      missingCompetencies: calculatedOverall < 75
        ? ['In-depth failure mode analysis', 'High-scale throughput optimization']
        : ['Secondary distributed failover nuances'],
      skills: fallbackSkills.length ? fallbackSkills : MOCK_EVALUATION_DATA.skills,
      strengths: calculatedOverall >= 75
        ? ['Clear technical articulation', 'Structured reasoning on trade-offs']
        : ['Transparent identification of knowledge limits'],
      areasToImprove: calculatedOverall < 75
        ? ['Deepen understanding of core architectural mechanics', 'Explain why specific technologies are chosen beyond buzzwords']
        : ['Elaborate on edge-case telemetry and monitoring'],
      communicationScore: Math.min(100, Math.max(30, calculatedOverall + 2)),
      technicalDepthScore: calculatedOverall,
      problemSolvingScore: calculatedOverall,
      structureScore: Math.min(100, Math.max(30, calculatedOverall - 1)),
      questionResults: session.responses.length
        ? session.responses.map((r, idx) => {
            const q = session.questions.find(item => item.id === r.questionId) || session.questions[idx];
            const ev = session.evidences.find(e => e.questionId === r.questionId);
            const qScore = ev?.score !== undefined ? ev.score : calculatedOverall;
            return {
              questionNumber: idx + 1,
              topic: r.skill || q?.topic || 'Architecture',
              question: r.question || q?.question || 'Technical scenario',
              candidateSummary: r.notes || r.answer || 'Candidate presented structured response.',
              score: qScore,
              difficulty: r.questionDifficulty || q?.difficulty || 'Medium',
              keyPointsDemonstrated: ev?.demonstratedKnowledge?.length ? ev.demonstratedKnowledge : ['Baseline technical concepts'],
              missedOpportunities: ev?.missingKnowledge?.length ? ev.missingKnowledge : ['Deep failure modes and trade-off justification'],
              aiNote: ev?.followUpRecommendation || (qScore >= 75 ? 'Demonstrated practical competence.' : 'Candidate demonstrated limited technical depth on this topic.')
            };
          })
        : MOCK_EVALUATION_DATA.questionResults
    };

    setSession(prev => ({
      ...prev,
      status: 'COMPLETED',
      completedAt,
      evaluation: synthesizedReport
    }));
  }, [session.config, session.questions, session.responses, session.evidences]);

  /**
   * Advance to the next question or complete the interview if on final question.
   */
  const advanceToNextQuestion = useCallback(async () => {
    setSession(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      if (nextIndex < prev.questions.length) {
        const nextQ = prev.questions[nextIndex];
        return {
          ...prev,
          status: 'LIVE',
          currentQuestionIndex: nextIndex,
          currentQuestion: nextQ,
          currentSkill: nextQ.topic,
          currentDifficulty: nextQ.difficulty
        };
      }
      return prev;
    });
  }, []);

  /**
   * Navigate back to the previous question without losing session progress.
   */
  const goToPreviousQuestion = useCallback(() => {
    setSession(prev => {
      if (prev.currentQuestionIndex <= 0) return prev;
      const prevIndex = prev.currentQuestionIndex - 1;
      const prevQ = prev.questions[prevIndex];
      return {
        ...prev,
        status: 'LIVE',
        currentQuestionIndex: prevIndex,
        currentQuestion: prevQ,
        currentSkill: prevQ.topic,
        currentDifficulty: prevQ.difficulty
      };
    });
  }, []);

  /**
   * Directly assign or update the interview evaluation report.
   */
  const setEvaluation = useCallback((evaluation: InterviewEvaluation) => {
    setSession(prev => ({
      ...prev,
      evaluation
    }));
  }, []);

  /**
   * Reset session state back to initial configuration mode.
   */
  const resetInterview = useCallback(() => {
    setSession(INITIAL_SESSION_STATE);
  }, []);

  // Computed helper flags
  const isConfiguring = session.status === 'CONFIGURING';
  const isGenerating = session.status === 'GENERATING';
  const isReady = session.status === 'READY';
  const isLive = session.status === 'LIVE';
  const isEvaluating = session.status === 'EVALUATING';
  const isCompleted = session.status === 'COMPLETED';
  const totalQuestions = session.questions.length;
  const currentQuestionNumber = session.currentQuestionIndex + 1;
  const hasMoreQuestions = session.currentQuestionIndex < totalQuestions - 1;
  const skillsTested = Array.from(new Set(session.responses.map(r => r.skill)));

  return {
    session,
    startInterview,
    setCurrentQuestion,
    submitAnswer,
    setEvaluation,
    advanceToNextQuestion,
    goToPreviousQuestion,
    completeInterview,
    resetInterview,
    isConfiguring,
    isGenerating,
    isReady,
    isLive,
    isEvaluating,
    isCompleted,
    totalQuestions,
    currentQuestionNumber,
    hasMoreQuestions,
    skillsTested
  };
}
