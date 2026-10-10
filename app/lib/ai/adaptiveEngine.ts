/**
 * InterviewAI Adaptive Engine
 * Interprets answer depth, evaluates technical evidence, and manages dynamic difficulty transitions.
 */

import type {
  AdaptiveDecision,
  DifficultyLevel,
  EvaluationEvidence,
  QuestionData
} from '../../types/interview';

export type DifficultyTier = 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced';

const DIFFICULTY_LADDER: DifficultyTier[] = ['Easy', 'Medium', 'Hard', 'Adaptive High', 'Advanced'];

/**
 * Calculates the next difficulty tier based on the adaptive decision.
 */
export function calculateNextDifficulty(
  currentDifficulty: string,
  decision: AdaptiveDecision
): DifficultyTier {
  const currentIndex = DIFFICULTY_LADDER.indexOf(currentDifficulty as DifficultyTier);
  const safeIndex = currentIndex !== -1 ? currentIndex : 1; // Default to 'Medium'

  switch (decision) {
    case 'increase_difficulty':
      return DIFFICULTY_LADDER[Math.min(safeIndex + 1, DIFFICULTY_LADDER.length - 1)];

    case 'decrease_difficulty':
      return DIFFICULTY_LADDER[Math.max(safeIndex - 1, 0)];

    case 'probe_deeper':
      // Maintain current tier or step into Adaptive High
      return safeIndex < 3 ? DIFFICULTY_LADDER[safeIndex + 1] : (currentDifficulty as DifficultyTier);

    case 'clarify':
    case 'continue_current_topic':
    case 'move_to_next_skill':
    default:
      return currentDifficulty as DifficultyTier;
  }
}

/**
 * Fallback adaptive evaluator used when no LLM API key is provided or offline.
 * Analyzes candidate text heuristics to simulate realistic human interviewer probing.
 * Hardened against raw buzzword stuffing while fairly rewarding concise, accurate explanations.
 */
export function generateHeuristicEvaluation(
  question: QuestionData,
  candidateAnswer: string,
  currentDifficulty: string
): {
  score: number;
  confidence: number;
  demonstratedKnowledge: string[];
  missingKnowledge: string[];
  strengths: string[];
  weaknesses: string[];
  decision: AdaptiveDecision;
  reasoning: string;
  nextQuestion: string;
  nextDifficulty: DifficultyTier;
} {
  const answerClean = (candidateAnswer || '').trim();
  const answerLower = answerClean.toLowerCase();
  const words = answerClean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Case 1: Empty or Zero-content answer
  if (wordCount === 0) {
    const nextDiff = calculateNextDifficulty(currentDifficulty, 'decrease_difficulty');
    return {
      score: 0,
      confidence: 0.99,
      demonstratedKnowledge: [],
      missingKnowledge: question.expectedKeyPoints,
      strengths: [],
      weaknesses: ['No answer provided for this technical scenario'],
      decision: 'decrease_difficulty',
      reasoning: 'Candidate provided no response; stepping down to foundational diagnostic probe.',
      nextQuestion: `Let's take a simpler starting point: in basic terms, what is the primary role of ${question.topic || 'this system'}?`,
      nextDifficulty: nextDiff
    };
  }

  // Case 2: Candidate admits complete uncertainty or provides a 1-2 word refusal (Poor: 10-30)
  if (
    answerLower === 'pass' ||
    answerLower.includes("don't know") ||
    answerLower.includes('not sure') ||
    answerLower.includes('no idea') ||
    answerLower.includes('unfamiliar') ||
    (wordCount < 4 && (answerLower.includes('idk') || answerLower.includes('skip') || answerLower.includes('none')))
  ) {
    const nextDiff = calculateNextDifficulty(currentDifficulty, 'decrease_difficulty');
    return {
      score: 25,
      confidence: 0.95,
      demonstratedKnowledge: ['Transparently communicated knowledge boundary'],
      missingKnowledge: question.expectedKeyPoints,
      strengths: ['Honest assessment of unfamiliarity'],
      weaknesses: ['Did not explain core architectural mechanics or concepts'],
      decision: 'decrease_difficulty',
      reasoning: 'Candidate expressed uncertainty; stepping down to foundational conceptual probe.',
      nextQuestion: `No problem, let's step back: in simple terms, what core problem does ${question.topic || 'this technique'} solve in production systems?`,
      nextDifficulty: nextDiff
    };
  }

  const technicalKeywords = [
    'latency', 'throughput', 'memory', 'cpu', 'concurrency', 'async',
    'lock', 'index', 'partition', 'cache', 'timeout', 'retry', 'circuit',
    'sharding', 'event loop', 'embedding', 'quantization', 'hnsw', 'cross-encoder',
    'rerank', 'checkpoint', 'guardrail', 'pydantic', 'queue', 'idempotency',
    'chunking', 'semantic', 'vector', 'postgres', 'redis', 'kafka', 'sse'
  ];
  const matchedKeywords = technicalKeywords.filter(kw => answerLower.includes(kw));

  // Explanatory reasoning connectives and action verbs
  const reasoningConnectives = [
    'because', 'due to', 'in order to', 'trade-off', 'tradeoff', 'instead of',
    'reduces', 'prevents', 'handles', 'ensures', 'causes', 'mitigates',
    'balances', 'compared to', 'allows', 'optimizes', 'avoids', 'avoid',
    'avoiding', 'to avoid', 'so that', 'to preserve', 'to optimize',
    'to reduce', 'to handle', 'to prevent', 'by splitting', 'by using',
    'by chunking', 'by applying', 'to maintain', 'to ensure', 'for retrieval'
  ];
  const hasReasoningConnective = reasoningConnectives.some(c => answerLower.includes(c));

  // Check for basic sentence structure / explanatory verbs
  const explanatoryVerbs = [
    'we use', 'i would', 'we should', 'we implement', 'implementing',
    'using', 'stores', 'storing', 'split', 'splitting', 'routes',
    'routing', 'scales', 'scaling', 'applies', 'applying', 'configure',
    'configuring', 'optimize', 'optimizing', 'balance', 'balancing',
    'implement', 'process', 'manage'
  ];
  const hasExplanatoryVerb = explanatoryVerbs.some(v => answerLower.includes(v));

  // Case 3: Buzzword Stuffing / Keyword List without explanatory substance (Poor: 35-45)
  // Example: "latency throughput memory cpu concurrency async lock index partition"
  const isKeywordDumping = matchedKeywords.length >= 3 && !hasReasoningConnective && !hasExplanatoryVerb;
  if (isKeywordDumping) {
    return {
      score: 40,
      confidence: 0.90,
      demonstratedKnowledge: ['Familiarity with isolated domain vocabulary terms'],
      missingKnowledge: question.expectedKeyPoints,
      strengths: ['Recognizes relevant terminology'],
      weaknesses: ['Listed terms without explaining relationships, trade-offs, or concrete mechanisms'],
      decision: 'clarify',
      reasoning: 'Candidate listed keywords but did not explain how they apply to the architecture scenario.',
      nextQuestion: `You mentioned ${matchedKeywords.slice(0, 2).join(' and ')}. Can you explain how you would specifically configure or use them in this scenario?`,
      nextDifficulty: currentDifficulty as DifficultyTier
    };
  }

  // Case 4: Vague keyword drop or superficial filler (Needs Improvement: 45-55)
  if (
    wordCount < 10 &&
    (answerLower.includes('etc') ||
     answerLower.includes('just use') ||
     answerLower.includes('standard') ||
     answerLower.includes('something like') ||
     matchedKeywords.length === 0)
  ) {
    return {
      score: 48,
      confidence: 0.88,
      demonstratedKnowledge: [question.expectedKeyPoints[0] || 'High-level concept'],
      missingKnowledge: question.expectedKeyPoints.slice(1).length ? question.expectedKeyPoints.slice(1) : ['Concrete failure mode handling', 'Trade-off justification'],
      strengths: ['Identified relevant high-level terminology'],
      weaknesses: ['Lacks concrete trade-off rationale or failure-mode reasoning'],
      decision: 'clarify',
      reasoning: 'Candidate gave a superficial answer without operational specifics or trade-offs.',
      nextQuestion: `What specific trade-off or failure mode led you to that choice over a simpler alternative in ${question.topic}?`,
      nextDifficulty: currentDifficulty as DifficultyTier
    };
  }

  // Case 5: Partial overview with moderate depth (Satisfactory: 60-74)
  if (!hasReasoningConnective || (matchedKeywords.length <= 1 && wordCount < 15)) {
    return {
      score: 68,
      confidence: 0.86,
      demonstratedKnowledge: [question.expectedKeyPoints[0] || 'Basic approach structure'],
      missingKnowledge: question.expectedKeyPoints.slice(1).length ? question.expectedKeyPoints.slice(1) : ['Operational scale trade-offs', 'Resilience patterns'],
      strengths: ['Clear directional approach and relevant concept application'],
      weaknesses: ['Could elaborate further on throughput constraints and failure recovery'],
      decision: 'probe_deeper',
      reasoning: 'Candidate provided a working conceptual baseline; probing into operational constraints.',
      nextQuestion: `Good foundation. How would you handle connection timeouts or rate spikes in this ${question.topic} setup?`,
      nextDifficulty: currentDifficulty as DifficultyTier
    };
  }

  // Case 6: Strong or Exceptional response explaining mechanics and trade-offs (Strong: 75-89, Exceptional: 90-100)
  const isExplicitTradeoff = (answerLower.includes('trade-off') || answerLower.includes('tradeoff') || answerLower.includes('instead of') || answerLower.includes('cost of') || (answerLower.includes('because') && answerLower.includes('memory')));
  const isExceptional = matchedKeywords.length >= 2 && hasReasoningConnective && isExplicitTradeoff;
  const demonstrated = question.expectedKeyPoints.slice(0, Math.max(2, Math.min(question.expectedKeyPoints.length, 3)));
  const missing = question.expectedKeyPoints.slice(3);
  const nextDiff = calculateNextDifficulty(currentDifficulty, isExceptional ? 'increase_difficulty' : 'probe_deeper');

  return {
    score: isExceptional ? 92 : 85,
    confidence: 0.94,
    demonstratedKnowledge: demonstrated.length ? demonstrated : ['System trade-off analysis', 'Concrete failure handling'],
    missingKnowledge: missing.length > 0 ? missing : ['Multi-region active-active failover nuances'],
    strengths: [
      'Direct, high-signal technical explanation with clear reasoning',
      'Awareness of architectural constraints and trade-offs'
    ],
    weaknesses: [
      'Could touch on long-term data migration or telemetry instrumentation'
    ],
    decision: isExceptional ? 'increase_difficulty' : 'probe_deeper',
    reasoning: isExceptional
      ? 'Candidate provided exceptional technical depth with clear trade-off awareness. Escalating difficulty.'
      : 'Candidate provided a clear, accurate explanation. Probing into downstream edge cases.',
    nextQuestion: `Makes sense. How would this setup hold up if downstream services experience 15% intermittent 504 timeouts?`,
    nextDifficulty: nextDiff
  };
}
