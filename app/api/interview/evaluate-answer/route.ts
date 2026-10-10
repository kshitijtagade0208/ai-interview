import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '../../../lib/ai/client';
import { ANSWER_EVALUATOR_SYSTEM_PROMPT } from '../../../lib/ai/prompts';
import { generateHeuristicEvaluation } from '../../../lib/ai/adaptiveEngine';
import { parseScore } from '../../../lib/evaluation/scoring';
import { AdaptiveDecision, QuestionData } from '../../../types/interview';

interface EvaluateAnswerRequestBody {
  question?: string;
  candidateAnswer?: string;
  skill?: string;
  jobDescription?: string;
  expectedEvidence?: string[];
  previousEvidence?: unknown[];
  currentDifficulty?: string;
  questionData?: QuestionData;
}

interface EvaluationResponseData {
  score: number;
  confidence: number;
  demonstratedKnowledge: string[];
  missingKnowledge: string[];
  strengths: string[];
  weaknesses: string[];
  decision: AdaptiveDecision;
  reasoning: string;
  nextQuestion: string;
  nextDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced';
}

const VALID_DECISIONS: AdaptiveDecision[] = [
  'probe_deeper',
  'increase_difficulty',
  'decrease_difficulty',
  'clarify',
  'move_to_next_skill',
  'continue_current_topic'
];

export async function POST(req: NextRequest) {
  try {
    const body: EvaluateAnswerRequestBody = await req.json();
    const {
      question = '',
      candidateAnswer = '',
      skill = 'System Design',
      jobDescription = '',
      expectedEvidence = [],
      currentDifficulty = 'Medium',
      questionData
    } = body;

    const userPrompt = `Evaluate this candidate answer:

Question Asked:
"${question || questionData?.question || 'Technical question'}"

Skill / Focus: ${skill}
Current Difficulty: ${currentDifficulty}

Target Job Description Context:
"""
${jobDescription || 'Standard engineering requirements'}
"""

Expected Key Evidence Points:
${expectedEvidence.length ? expectedEvidence.map(e => `- ${e}`).join('\n') : '- Core principles and trade-offs'}

Candidate's Actual Answer:
"""
${candidateAnswer.trim() || 'Candidate provided no response or expressed uncertainty.'}
"""

EVALUATION INSTRUCTIONS:
1. Fairness to Conciseness: If the candidate's answer is concise (2-4 sentences) but accurately captures the core mechanism and trade-off, score it favorably (85-95). Do NOT penalize brevity or demand unprompted essays/code.
2. Formulate a sharp, conversational 1-2 sentence follow-up question based directly on what the candidate just stated.`;

    const aiResult = await generateAIResponse<EvaluationResponseData>({
      systemPrompt: ANSWER_EVALUATOR_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      jsonMode: true
    });

    if (aiResult.success && aiResult.data) {
      const data = aiResult.data;

      // Ensure valid decision tag
      const safeDecision: AdaptiveDecision = VALID_DECISIONS.includes(data.decision)
        ? data.decision
        : 'continue_current_topic';

      return NextResponse.json({
        success: true,
        score: parseScore(data.score, 0),
        confidence: typeof data.confidence === 'number' && Number.isFinite(data.confidence)
          ? Math.min(1, Math.max(0, data.confidence))
          : 0.9,
        demonstratedKnowledge: Array.isArray(data.demonstratedKnowledge) ? data.demonstratedKnowledge : [],
        missingKnowledge: Array.isArray(data.missingKnowledge) ? data.missingKnowledge : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : ['Clear articulation'],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
        decision: safeDecision,
        reasoning: data.reasoning || 'Evaluated answer against target competency criteria.',
        nextQuestion: data.nextQuestion || 'Can you walk me through an edge case in this architecture?',
        nextDifficulty: data.nextDifficulty || currentDifficulty
      });
    }

    // Heuristic fallback if no API key is provided
    const fallbackQuestionData: QuestionData = questionData || {
      id: 1,
      title: skill,
      topic: skill,
      difficulty: (currentDifficulty as 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced') || 'Medium',
      timeLimitSeconds: 300,
      question: question || 'System scenario',
      hints: [],
      expectedKeyPoints: expectedEvidence.length ? expectedEvidence : [
        `Core principles and implementation of ${skill}`,
        'Trade-off and performance considerations',
        'Resilience and error mitigation'
      ]
    };

    const fallbackEval = generateHeuristicEvaluation(
      fallbackQuestionData,
      candidateAnswer,
      currentDifficulty
    );

    return NextResponse.json({
      success: true,
      ...fallbackEval,
      note: aiResult.isMockFallback
        ? 'Evaluated via adaptive heuristic engine (Configure OPENAI_API_KEY for dynamic LLM evaluation)'
        : undefined
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate answer';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
