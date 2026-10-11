export type ScreenType = 'dashboard' | 'setup' | 'live' | 'results';

export type DifficultyLevel = 'beginner' | 'adaptive' | 'advanced';

export type InterviewDuration = 15 | 30 | 45 | 60;

export type InterviewLifecycleStatus =
  | 'CONFIGURING'
  | 'GENERATING'
  | 'READY'
  | 'LIVE'
  | 'EVALUATING'
  | 'COMPLETED';

export type AdaptiveDecision =
  | 'probe_deeper'
  | 'increase_difficulty'
  | 'decrease_difficulty'
  | 'clarify'
  | 'move_to_next_skill'
  | 'continue_current_topic';

export interface SkillItem {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'system-design' | 'devops' | 'ai-ml' | 'soft-skills';
  level: number; // 0 - 100
  verified: boolean;
}

export interface RecentInterview {
  id: string;
  role: string;
  companyTarget?: string;
  date: string;
  durationMinutes: number;
  overallScore: number;
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Improvement';
  difficulty: DifficultyLevel;
  jdMatchScore: number;
  skillsAssessed: string[];
}

export interface QuestionData {
  id: number;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced';
  timeLimitSeconds: number;
  question: string;
  codeSnippet?: string;
  hints: string[];
  expectedKeyPoints: string[];
  conversationalResponse?: string;
}

export interface InterviewConfig {
  targetRole: string;
  companyName: string;
  jobDescription: string;
  selectedSkills: string[];
  difficulty: DifficultyLevel;
  duration: InterviewDuration;
  focusAreas: string[];
}

export interface SkillScore {
  skill: string;
  score: number;
  category: string;
  feedback: string;
  strengths: string[];
  gaps: string[];
}

export interface QuestionResult {
  questionNumber: number;
  topic: string;
  question: string;
  candidateSummary: string;
  rawAnswer?: string;
  notes?: string;
  score: number;
  difficulty: string;
  keyPointsDemonstrated: string[];
  missedOpportunities: string[];
  aiNote: string;
}

export interface InterviewEvaluation {
  id: string;
  role: string;
  company: string;
  date: string;
  overallScore: number;
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Improvement';
  percentile: number;
  jdAlignmentScore: number;
  matchedRequirements: string[];
  missingCompetencies: string[];
  summary: string;
  skills: SkillScore[];
  strengths: string[];
  areasToImprove: string[];
  communicationScore: number;
  technicalDepthScore: number;
  problemSolvingScore: number;
  structureScore: number;
  questionResults: QuestionResult[];
}

export interface CandidateResponse {
  questionId: number;
  question: string;
  answer: string;
  notes?: string;
  skill: string;
  timestamp: string;
  questionDifficulty: string;
  timeSpentSeconds?: number;
}

export interface EvaluationEvidence {
  questionId: number;
  score: number;
  demonstratedKnowledge: string[];
  missingKnowledge: string[];
  strengths: string[];
  weaknesses: string[];
  confidence: number;
  followUpRecommendation: string;
  adaptiveDecision: AdaptiveDecision;
  conversationalResponse?: string;
}

export interface InterviewSessionState {
  status: InterviewLifecycleStatus;
  config: InterviewConfig;
  questions: QuestionData[];
  currentQuestionIndex: number;
  currentQuestion: QuestionData | null;
  currentSkill: string;
  currentDifficulty: string;
  responses: CandidateResponse[];
  evidences: EvaluationEvidence[];
  evaluation: InterviewEvaluation | null;
  startedAt: string | null;
  completedAt: string | null;
}
