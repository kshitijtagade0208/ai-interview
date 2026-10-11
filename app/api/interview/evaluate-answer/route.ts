import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '../../../lib/ai/client';
import { ANSWER_EVALUATOR_SYSTEM_PROMPT } from '../../../lib/ai/prompts';
import { generateHeuristicEvaluation } from '../../../lib/ai/adaptiveEngine';
import { parseScore } from '../../../lib/evaluation/scoring';
import { AdaptiveDecision, QuestionData } from '../../../types/interview';

interface ConversationTurn {
  role: 'interviewer' | 'candidate';
  content: string;
  topic?: string;
}

interface EvaluateAnswerRequestBody {
  question?: string;
  candidateAnswer?: string;
  skill?: string;
  jobDescription?: string;
  expectedEvidence?: string[];
  previousEvidence?: unknown[];
  currentDifficulty?: string;
  questionData?: QuestionData;
  conversationHistory?: ConversationTurn[];
}

interface EvaluationResponseData {
  conversationalResponse?: string;
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
      questionData,
      conversationHistory = []
    } = body;

    const formattedHistory = conversationHistory.length > 0
      ? `Prior Conversation Context:\n${conversationHistory
          .map(t => `${t.role === 'interviewer' ? 'Dr. Maya (Interviewer)' : 'Candidate'}: "${t.content}"`)
          .join('\n')}\n\n`
      : '';

    const userPrompt = `${formattedHistory}Current Interview Turn to Evaluate:

Question Asked:
"${question || questionData?.question || 'Technical question'}"

Skill / Focus Area: ${skill}
Current Difficulty Tier: ${currentDifficulty}

Target Job Description:
"""
${jobDescription || 'Standard engineering requirements'}
"""

Expected Key Evidence Points:
${expectedEvidence.length ? expectedEvidence.map(e => `- ${e}`).join('\n') : '- Core principles and trade-offs'}

Candidate's Actual Answer:
"""
${candidateAnswer.trim() || 'Candidate provided no response or expressed uncertainty.'}
"""

EVALUATION & CONVERSATIONAL INSTRUCTIONS:
1. "conversationalResponse": Speak back naturally to the candidate in 2-3 sentences. Acknowledge what they actually said (e.g. their specific choice of cache, database, partition key, or algorithm). Avoid generic filler.
2. If the answer was vague or just buzzwords, politely ask for concrete implementation details. If sharp, challenge with failure modes or latency scale. If unsure, provide an encouraging pivot to a simpler concept.
3. Do NOT repeat questions or topics from the Prior Conversation Context.
4. "nextQuestion": Standalone prompt for the question scenario view.`;

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

      const defaultSpokenResponse = data.nextQuestion
        ? `Makes sense. Let's look closer at this: ${data.nextQuestion}`
        : 'Understood. Let us move to the next scenario.';

      return NextResponse.json({
        success: true,
        conversationalResponse: data.conversationalResponse || defaultSpokenResponse,
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
