/**
 * InterviewAI Adaptive Engine
 * Interprets answer depth, evaluates technical evidence, and manages dynamic difficulty transitions.
 */

import type {
  AdaptiveDecision,
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
  conversationalResponse: string;
} {
  const answerClean = (candidateAnswer || '').trim();
  const answerLower = answerClean.toLowerCase();
  const words = answerClean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Case 1: Empty or Zero-content answer
  if (wordCount === 0) {
    const nextDiff = calculateNextDifficulty(currentDifficulty, 'decrease_difficulty');
    const nextQ = `Let's take a simpler starting point: in basic terms, what is the primary role of ${question.topic || 'this system'}?`;
    return {
      score: 0,
      confidence: 0.99,
      demonstratedKnowledge: [],
      missingKnowledge: question.expectedKeyPoints,
      strengths: [],
      weaknesses: ['No answer provided for this technical scenario'],
      decision: 'decrease_difficulty',
      reasoning: 'Candidate provided no response; stepping down to foundational diagnostic probe.',
      nextQuestion: nextQ,
      nextDifficulty: nextDiff,
      conversationalResponse: `I noticed you didn't provide a response for that scenario. ${nextQ}`
    };
  }

  // Case 2-Greeting: Audio Check / Greeting ("Hello, can you hear me?", "Hi Dr. Maya", "Testing mic")
  if (
    answerLower.includes('can you hear me') ||
    answerLower.includes('hello dr') ||
    answerLower.includes('hi dr') ||
    answerLower.includes('testing mic') ||
    answerLower === 'hello' ||
    answerLower === 'hi' ||
    answerLower.startsWith('hello ') ||
    answerLower.startsWith('hi ')
  ) {
    const nextQ = "Tell me a bit about yourself and a technical project you built recently.";
    return {
      score: 75,
      confidence: 0.95,
      demonstratedKnowledge: ['Live audio connection verified and candidate greeting acknowledged'],
      missingKnowledge: [],
      strengths: ['Clear audio setup and polite professional greeting'],
      weaknesses: [],
      decision: 'continue_current_topic',
      reasoning: 'Candidate greeted or performed audio check; warmly confirming audio.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: "Yes, I can hear you clearly! How are you doing today?"
    };
  }

  // Case 2-Pleasantry: Candidate answers pleasantry ("I'm good", "Doing well", "I am good")
  if (
    answerLower.includes("i'm good") ||
    answerLower.includes('doing well') ||
    answerLower.includes('i am good') ||
    answerLower.includes('doing fine') ||
    answerLower.includes('all good') ||
    (wordCount <= 3 && (answerLower.includes('good') || answerLower.includes('fine') || answerLower.includes('great')))
  ) {
    const nextQ = "To get us started, can you tell me about a technical project you built recently?";
    return {
      score: 75,
      confidence: 0.95,
      demonstratedKnowledge: ['Professional greeting acknowledged'],
      missingKnowledge: [],
      strengths: ['Engaged and ready to interview'],
      weaknesses: [],
      decision: 'continue_current_topic',
      reasoning: 'Candidate replied to pleasantry; transitioning into technical project discussion.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: "Great to hear! Let's get started. To kick things off, can you tell me about a technical project you built recently?"
    };
  }

  // Case 2-Project: Candidate mentions project with Groq / LangChain / Chatbot
  if (
    (answerLower.includes('chatbot') || answerLower.includes('agent') || answerLower.includes('bot')) &&
    (answerLower.includes('groq') || answerLower.includes('langchain') || answerLower.includes('llm') || answerLower.includes('rag'))
  ) {
    const nextQ = "Can you walk me through the architecture of your chatbot and how you integrated Groq with LangChain?";
    return {
      score: 82,
      confidence: 0.92,
      demonstratedKnowledge: ['Applied LLM application development with modern frameworks'],
      missingKnowledge: ['Architecture details', 'Latency benchmarks'],
      strengths: ['Relevant hands-on experience with modern LLM tooling'],
      weaknesses: ['Could detail failure modes or retrieval bottlenecks'],
      decision: 'probe_deeper',
      reasoning: 'Candidate described hands-on project; probing into technical architecture and integrations.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: "That sounds interesting! Can you walk me through the architecture of the chatbot and how you integrated Groq with LangChain?"
    };
  }

  // Case 2A: Candidate asks for explanation / clarification
  if (
    answerLower.includes('explain that') ||
    answerLower.includes('explain the question') ||
    answerLower.includes('what do you mean') ||
    answerLower.includes('clarify that') ||
    answerLower.includes('not familiar with the term')
  ) {
    const nextQ = `In practical terms, it relates to how your system handles workload surges or data flow without bottlenecks. How would you approach that in ${question.topic}?`;
    return {
      score: 55,
      confidence: 0.90,
      demonstratedKnowledge: ['Asked for problem context and clarification'],
      missingKnowledge: question.expectedKeyPoints,
      strengths: ['Transparent communication when clarifying requirements'],
      weaknesses: ['Unfamiliar with the initial terminology'],
      decision: 'clarify',
      reasoning: 'Candidate asked for clarification on the question.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `Sure! In simple terms, it's about managing high load or data flow so components don't get overwhelmed. ${nextQ}`
    };
  }

  // Case 2B: Candidate asks to repeat the question
  if (
    answerLower.includes('repeat the question') ||
    answerLower.includes('repeat that') ||
    answerLower.includes('say that again') ||
    answerLower.includes('connection broke')
  ) {
    return {
      score: 65,
      confidence: 0.95,
      demonstratedKnowledge: ['Communicated audio/network interruption'],
      missingKnowledge: [],
      strengths: ['Promptly asked for question repetition'],
      weaknesses: [],
      decision: 'clarify',
      reasoning: 'Candidate requested repetition of the current question.',
      nextQuestion: question.question,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `Sure, no problem! The question was: "${question.question}"`
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

  const explanatoryVerbs = [
    'we use', 'i would', 'we should', 'we implement', 'implementing',
    'using', 'stores', 'storing', 'split', 'splitting', 'routes',
    'routing', 'scales', 'scaling', 'applies', 'applying', 'configure',
    'configuring', 'optimize', 'optimizing', 'balance', 'balancing',
    'implement', 'process', 'manage'
  ];
  const hasExplanatoryVerb = explanatoryVerbs.some(v => answerLower.includes(v));

  // Case 3: Buzzword Stuffing / Keyword List without explanatory substance (Poor: 35-45)
  const isKeywordDumping = matchedKeywords.length >= 3 && !hasReasoningConnective && !hasExplanatoryVerb;
  if (isKeywordDumping) {
    const nextQ = `You mentioned ${matchedKeywords.slice(0, 2).join(' and ')}. Can you explain how you would specifically configure or use them in this scenario?`;
    return {
      score: 40,
      confidence: 0.90,
      demonstratedKnowledge: ['Familiarity with isolated domain vocabulary terms'],
      missingKnowledge: question.expectedKeyPoints,
      strengths: ['Recognizes relevant terminology'],
      weaknesses: ['Listed terms without explaining relationships, trade-offs, or concrete mechanisms'],
      decision: 'clarify',
      reasoning: 'Candidate listed keywords but did not explain how they apply to the architecture scenario.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `You touched on several key concepts there. To see how you apply them, ${nextQ}`
    };
  }

  // Case 2C: Concise answer focusing on speed / latency / performance
  if (
    wordCount < 12 &&
    (answerLower.includes('faster') || answerLower.includes('speed') || answerLower.includes('latency') || answerLower.includes('performance'))
  ) {
    const nextQ = `Speed is definitely critical. What specific latency or throughput targets were you aiming for, and did you hit them?`;
    return {
      score: 72,
      confidence: 0.88,
      demonstratedKnowledge: ['Performance and latency prioritization'],
      missingKnowledge: ['Concrete benchmark numbers', 'Comparative trade-offs'],
      strengths: ['Identified primary engineering motivation'],
      weaknesses: ['Could specify concrete metrics or benchmarks'],
      decision: 'probe_deeper',
      reasoning: 'Candidate identified performance motivation; probing into metrics.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `That makes sense—speed is critical. ${nextQ}`
    };
  }

  // Case 2D: Candidate admits complete uncertainty or provides a 1-2 word refusal (Poor: 10-30)
  if (
    answerLower === 'pass' ||
    answerLower.includes("don't know") ||
    answerLower.includes('not sure') ||
    answerLower.includes('no idea') ||
    answerLower.includes('unfamiliar') ||
    (wordCount < 4 && (answerLower.includes('idk') || answerLower.includes('skip') || answerLower.includes('none')))
  ) {
    const nextDiff = calculateNextDifficulty(currentDifficulty, 'decrease_difficulty');
    const nextQ = `No problem at all, let's step back: in simple terms, what core problem does ${question.topic || 'this technique'} solve in production systems?`;
    return {
      score: 25,
      confidence: 0.95,
      demonstratedKnowledge: ['Transparently communicated knowledge boundary'],
      missingKnowledge: question.expectedKeyPoints,
      strengths: ['Honest assessment of unfamiliarity'],
      weaknesses: ['Did not explain core architectural mechanics or concepts'],
      decision: 'decrease_difficulty',
      reasoning: 'Candidate expressed uncertainty; stepping down to foundational conceptual probe.',
      nextQuestion: nextQ,
      nextDifficulty: nextDiff,
      conversationalResponse: `Fair enough, honesty about unfamiliar tools is always appreciated. ${nextQ}`
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
    const nextQ = `What specific trade-off or failure mode led you to that choice over a simpler alternative in ${question.topic}?`;
    return {
      score: 48,
      confidence: 0.88,
      demonstratedKnowledge: [question.expectedKeyPoints[0] || 'High-level concept'],
      missingKnowledge: question.expectedKeyPoints.slice(1).length ? question.expectedKeyPoints.slice(1) : ['Concrete failure mode handling', 'Trade-off justification'],
      strengths: ['Identified relevant high-level terminology'],
      weaknesses: ['Lacks concrete trade-off rationale or failure-mode reasoning'],
      decision: 'clarify',
      reasoning: 'Candidate gave a superficial answer without operational specifics or trade-offs.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `Got it. That gives us a high-level direction, but let's dive into the trade-offs: ${nextQ}`
    };
  }

  // Case 5: Partial overview with moderate depth (Satisfactory: 60-74)
  if (!hasReasoningConnective || (matchedKeywords.length <= 1 && wordCount < 15)) {
    const nextQ = `How would you handle connection timeouts or rate spikes in this ${question.topic} setup?`;
    return {
      score: 68,
      confidence: 0.86,
      demonstratedKnowledge: [question.expectedKeyPoints[0] || 'Basic approach structure'],
      missingKnowledge: question.expectedKeyPoints.slice(1).length ? question.expectedKeyPoints.slice(1) : ['Operational scale trade-offs', 'Resilience patterns'],
      strengths: ['Clear directional approach and relevant concept application'],
      weaknesses: ['Could elaborate further on throughput constraints and failure recovery'],
      decision: 'probe_deeper',
      reasoning: 'Candidate provided a working conceptual baseline; probing into operational constraints.',
      nextQuestion: nextQ,
      nextDifficulty: currentDifficulty as DifficultyTier,
      conversationalResponse: `That's a solid conceptual baseline. Now, let's explore operational resilience: ${nextQ}`
    };
  }

  // Case 6: Strong or Exceptional response explaining mechanics and trade-offs (Strong: 75-89, Exceptional: 90-100)
  const isExplicitTradeoff = (answerLower.includes('trade-off') || answerLower.includes('tradeoff') || answerLower.includes('instead of') || answerLower.includes('cost of') || (answerLower.includes('because') && answerLower.includes('memory')));
  const isExceptional = matchedKeywords.length >= 2 && hasReasoningConnective && isExplicitTradeoff;
  const demonstrated = question.expectedKeyPoints.slice(0, Math.max(2, Math.min(question.expectedKeyPoints.length, 3)));
  const missing = question.expectedKeyPoints.slice(3);
  const nextDiff = calculateNextDifficulty(currentDifficulty, isExceptional ? 'increase_difficulty' : 'probe_deeper');
  const nextQ = `How would this architecture hold up if downstream services experience intermittent 504 timeouts or high traffic skew?`;

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
    nextQuestion: nextQ,
    nextDifficulty: nextDiff,
    conversationalResponse: isExceptional
      ? `Really good articulation on those trade-offs. Let's push into production edge cases: ${nextQ}`
      : `Makes sense on that architectural decision. Now let's consider resilience: ${nextQ}`
  };
}
