/**
 * InterviewAI Scoring & Evaluation Calibration Utility
 * Provides consistent, configurable scoring thresholds, scorecard labels,
 * overall score derivation, and recommendation calibration across all reports.
 */

export type ScorecardLabel = 'Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Improvement' | 'Poor';

export type HiringVerdict = 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Needs Improvement';

export interface ScorecardBadgeStyle {
  label: ScorecardLabel;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Maps a numerical score (0-100) to its standardized scorecard descriptive label.
 * Configured thresholds:
 * 90–100: Exceptional
 * 75–89:  Strong
 * 60–74:  Satisfactory
 * 40–59:  Needs Improvement
 * 0–39:   Poor
 */
export function getScoreLabel(score: number): ScorecardLabel {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  if (normalized >= 90) return 'Exceptional';
  if (normalized >= 75) return 'Strong';
  if (normalized >= 60) return 'Satisfactory';
  if (normalized >= 40) return 'Needs Improvement';
  return 'Poor';
}

/**
 * Returns badge styling attributes tailored for the application UI theme.
 */
export function getScoreBadgeStyle(score: number): ScorecardBadgeStyle {
  const label = getScoreLabel(score);
  switch (label) {
    case 'Exceptional':
      return {
        label,
        textColor: 'text-[#B8F34A]',
        bgColor: 'bg-[#B8F34A]/10',
        borderColor: 'border-[#B8F34A]/30'
      };
    case 'Strong':
      return {
        label,
        textColor: 'text-[#9B7CFF]',
        bgColor: 'bg-[#7C5CFF]/15',
        borderColor: 'border-[#7C5CFF]/30'
      };
    case 'Satisfactory':
      return {
        label,
        textColor: 'text-[#38BDF8]',
        bgColor: 'bg-[#38BDF8]/10',
        borderColor: 'border-[#38BDF8]/30'
      };
    case 'Needs Improvement':
      return {
        label,
        textColor: 'text-[#F5C451]',
        bgColor: 'bg-[#F5C451]/10',
        borderColor: 'border-[#F5C451]/30'
      };
    case 'Poor':
    default:
      return {
        label,
        textColor: 'text-[#F87171]',
        bgColor: 'bg-[#F87171]/10',
        borderColor: 'border-[#F87171]/30'
      };
  }
}

/**
 * Calibrates hiring recommendation strictly from numerical score and technical evidence.
 * Thresholds:
 * 88–100: Strong Hire
 * 75–87:  Hire
 * 60–74:  Lean Hire
 * 0–59:   Needs Improvement
 */
export function getVerdictFromScore(score: number): HiringVerdict {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  if (normalized >= 88) return 'Strong Hire';
  if (normalized >= 75) return 'Hire';
  if (normalized >= 60) return 'Lean Hire';
  return 'Needs Improvement';
}

/**
 * Safely parses and clamps a numeric score (0-100), strictly preserving valid 0s.
 * Only falls back to the default fallback when val is undefined, null, NaN, or non-numeric.
 */
export function parseScore(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.min(100, Math.max(0, Math.round(val)));
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    if (Number.isFinite(num)) {
      return Math.min(100, Math.max(0, Math.round(num)));
    }
  }
  return Math.min(100, Math.max(0, Math.round(fallback)));
}

/**
 * Derives an overall score from question scores and soft skill dimensions.
 * Ensures zero hardcoding, zero artificial boosts, and strict preservation of 0 scores.
 */
export function calculateOverallScore(
  questionScores: number[],
  dimensions?: {
    technicalDepth?: number;
    communication?: number;
    problemSolving?: number;
    structure?: number;
  }
): number {
  if (!questionScores || questionScores.length === 0) {
    if (dimensions && Object.keys(dimensions).length > 0) {
      const vals = Object.values(dimensions)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .map(v => parseScore(v, 0));
      if (vals.length > 0) {
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
    return 0;
  }

  const validQuestionScores = questionScores.map(s => parseScore(s, 0));
  const avgQuestions = validQuestionScores.reduce((a, b) => a + b, 0) / validQuestionScores.length;

  if (dimensions) {
    const dimVals = [
      dimensions.technicalDepth,
      dimensions.communication,
      dimensions.problemSolving,
      dimensions.structure
    ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
     .map(v => parseScore(v, 0));

    if (dimVals.length > 0) {
      const avgDims = dimVals.reduce((a, b) => a + b, 0) / dimVals.length;
      // 70% weighted to direct question problem-solving evidence, 30% to dimensions
      return Math.round(avgQuestions * 0.7 + avgDims * 0.3);
    }
  }

  return Math.round(avgQuestions);
}

/**
 * Computes an honest percentile rank based on overall score.
 */
export function calculatePercentile(score: number): number {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  if (normalized >= 95) return 98;
  if (normalized >= 90) return 94;
  if (normalized >= 85) return 88;
  if (normalized >= 80) return 82;
  if (normalized >= 75) return 76;
  if (normalized >= 70) return 65;
  if (normalized >= 60) return 52;
  if (normalized >= 50) return 38;
  if (normalized >= 40) return 25;
  return Math.max(1, Math.round(normalized * 0.5));
}

/**
 * Resolves the effective answer string from answer and notes inputs.
 * - If answer and notes contain identical trimmed content, returns content once without duplication.
 * - If both are provided and genuinely different (and answer is not a placeholder), combines them cleanly.
 * - If only one is provided (or one is a placeholder), returns the real content.
 * - If both are empty or placeholder, returns standardized verbal placeholder.
 */
export function resolveEffectiveAnswer(answer?: string, notes?: string): string {
  const trimmedAnswer = (answer || '').trim();
  const trimmedNotes = (notes || '').trim();

  const isVerbalPlaceholder = (val: string) =>
    !val ||
    val === 'Candidate verbally presented answer.' ||
    val === 'Candidate presented verbal response.';

  const isAnswerPlaceholder = isVerbalPlaceholder(trimmedAnswer);
  const isNotesPlaceholder = isVerbalPlaceholder(trimmedNotes);

  if (trimmedAnswer && trimmedNotes && !isAnswerPlaceholder && !isNotesPlaceholder) {
    if (trimmedAnswer === trimmedNotes) {
      return trimmedAnswer;
    }
    return `${trimmedAnswer}\n\n[Candidate Notes & Code]:\n${trimmedNotes}`;
  }

  if (trimmedAnswer && !isAnswerPlaceholder) {
    return trimmedAnswer;
  }

  if (trimmedNotes && !isNotesPlaceholder) {
    return trimmedNotes;
  }

  return 'Candidate presented verbal response.';
}

/**
 * Combines pending finalized transcript and interim speech transcript with the current scratchpad text.
 * Prevents text duplication, handles speech-recognition race conditions, and preserves typed answers.
 */
export function composeFinalAnswer(
  scratchpad: string = '',
  finalTranscript: string = '',
  interimTranscript: string = ''
): string {
  let result = (scratchpad || '').trim();
  const finalSpeech = (finalTranscript || '').trim();
  const interimSpeech = (interimTranscript || '').trim();

  // 1. Merge finalized speech if not already present in scratchpad
  if (finalSpeech) {
    if (!result) {
      result = finalSpeech;
    } else if (!result.includes(finalSpeech)) {
      result = `${result}\n${finalSpeech}`.trim();
    }
  }

  // 2. Merge interim speech if not already present in scratchpad or finalized transcript
  if (interimSpeech) {
    if (!result) {
      result = interimSpeech;
    } else if (!result.includes(interimSpeech)) {
      result = `${result} ${interimSpeech}`.trim();
    }
  }

  return result;
}

