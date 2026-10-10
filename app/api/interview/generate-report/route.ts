import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '../../../lib/ai/client';
import { FINAL_REPORT_SYSTEM_PROMPT } from '../../../lib/ai/prompts';
import {
  CandidateResponse,
  EvaluationEvidence,
  InterviewEvaluation,
  QuestionData,
  SkillScore
} from '../../../types/interview';
import {
  calculateOverallScore,
  getVerdictFromScore,
  calculatePercentile,
  parseScore
} from '../../../lib/evaluation/scoring';
import { MOCK_EVALUATION_DATA } from '../../../data/mockData';

interface GenerateReportRequestBody {
  role?: string;
  company?: string;
  jobDescription?: string;
  skills?: string[];
  questions?: QuestionData[];
  responses?: CandidateResponse[];
  evidences?: EvaluationEvidence[];
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateReportRequestBody = await req.json();
    const {
      role = 'Senior Software Engineer',
      company = 'Target Organization',
      jobDescription = '',
      skills = ['System Design', 'TypeScript', 'Node.js'],
      questions = [],
      responses = [],
      evidences = []
    } = body;

    const sessionTranscript = responses.map((r, idx) => {
      const q = questions.find(qItem => qItem.id === r.questionId) || questions[idx];
      const ev = evidences.find(e => e.questionId === r.questionId);
      return `--- Question ${idx + 1} (${r.skill || q?.topic || 'General'}) [Difficulty: ${r.questionDifficulty || q?.difficulty}] ---
Question ID: ${r.questionId}
Question Title: ${q?.title || 'Technical Question'}
Question Prompt:
"${r.question || q?.question}"

Candidate's Actual Submitted Answer:
"""
${r.answer || r.notes || 'Candidate presented verbal response.'}
"""

${r.notes ? `Candidate Scratchpad Notes:\n"""\n${r.notes}\n"""\n` : ''}Real-Time Evaluator Score: ${ev?.score !== undefined ? ev.score : 'N/A'}/100
Demonstrated Points: ${ev?.demonstratedKnowledge?.join(', ') || 'N/A'}
Missing Points: ${ev?.missingKnowledge?.join(', ') || 'N/A'}
Evaluation Decision: ${ev?.adaptiveDecision || 'N/A'}`;
    }).join('\n\n');

    const userPrompt = `Synthesize the final technical interview assessment report for:
Target Role: ${role}
Target Company: ${company}
Required Skills: ${skills.join(', ')}

Job Description:
"""
${jobDescription || 'Standard requirements for ' + role}
"""

Session Transcript & Real-Time Answer Records:
${sessionTranscript || 'No recorded responses; evaluate based on overall baseline.'}

CRITICAL:
1. Under "questionResults", output exactly ${responses.length || questions.length || 1} items matching each Question (1 to ${responses.length || questions.length || 1}) from the transcript.
2. For Question 1, evaluate ONLY the candidate's answer to Question 1. Do NOT mix up answers across different questions.
3. Compute concrete skill scores, evidence from actual answers, strengths, areas to improve, and JD alignment.`;

    const aiResult = await generateAIResponse<InterviewEvaluation>({
      systemPrompt: FINAL_REPORT_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      jsonMode: true
    });

    if (aiResult.success && aiResult.data) {
      // Ensure questionResults strictly map 1-to-1 to each response
      const mappedQuestionResults = responses.length
        ? responses.map((r, idx) => {
            const q = questions.find(item => item.id === r.questionId) || questions[idx];
            const ev = evidences.find(e => e.questionId === r.questionId);
            const aiQ = Array.isArray(aiResult.data?.questionResults)
              ? aiResult.data.questionResults.find(item => item.questionNumber === idx + 1) || aiResult.data.questionResults[idx]
              : null;

            const finalQScore = aiQ?.score !== undefined
              ? parseScore(aiQ.score, 0)
              : (ev?.score !== undefined ? parseScore(ev.score, 0) : 0);

            return {
              questionNumber: idx + 1,
              topic: aiQ?.topic || r.skill || q?.topic || 'Architecture',
              question: r.question || q?.question || aiQ?.question || 'Technical scenario',
              candidateSummary: aiQ?.candidateSummary || r.notes || r.answer || 'Candidate presented response.',
              rawAnswer: r.answer || r.notes || undefined,
              notes: r.notes || undefined,
              score: finalQScore,
              difficulty: aiQ?.difficulty || r.questionDifficulty || q?.difficulty || 'Medium',
              keyPointsDemonstrated: Array.isArray(aiQ?.keyPointsDemonstrated) && aiQ.keyPointsDemonstrated.length
                ? aiQ.keyPointsDemonstrated
                : (ev?.demonstratedKnowledge?.length ? ev.demonstratedKnowledge : ['Demonstrated baseline familiarity']),
              missedOpportunities: Array.isArray(aiQ?.missedOpportunities) && aiQ.missedOpportunities.length
                ? aiQ.missedOpportunities
                : (ev?.missingKnowledge?.length ? ev.missingKnowledge : ['Needs deeper edge-case coverage']),
              aiNote: aiQ?.aiNote || ev?.followUpRecommendation || 'Candidate provided response during interview session.'
            };
          })
        : (Array.isArray(aiResult.data.questionResults) && aiResult.data.questionResults.length
            ? aiResult.data.questionResults
            : MOCK_EVALUATION_DATA.questionResults);

      const qScores = mappedQuestionResults.map(q => q.score);
      const defaultDim = qScores.length ? Math.round(qScores.reduce((a, b) => a + b, 0) / qScores.length) : 0;
      const techDepth = parseScore(aiResult.data.technicalDepthScore, defaultDim);
      const commScore = parseScore(aiResult.data.communicationScore, defaultDim);
      const probScore = parseScore(aiResult.data.problemSolvingScore, defaultDim);
      const structScore = parseScore(aiResult.data.structureScore, defaultDim);

      // Calibrate overall score directly from question performance & soft-skill dimensions
      const calculatedOverall = calculateOverallScore(qScores, {
        technicalDepth: techDepth,
        communication: commScore,
        problemSolving: probScore,
        structure: structScore
      });

      const calibratedVerdict = getVerdictFromScore(calculatedOverall);
      const calibratedPercentile = calculatePercentile(calculatedOverall);

      const report: InterviewEvaluation = {
        id: `eval-${Date.now()}`,
        role,
        company,
        date: 'Just now',
        overallScore: calculatedOverall,
        verdict: calibratedVerdict,
        percentile: calibratedPercentile,
        jdAlignmentScore: parseScore(aiResult.data.jdAlignmentScore, calculatedOverall),
        summary: aiResult.data.summary || `Candidate completed the technical evaluation with an overall score of ${calculatedOverall}/100.`,
        matchedRequirements: Array.isArray(aiResult.data.matchedRequirements) && aiResult.data.matchedRequirements.length
          ? aiResult.data.matchedRequirements
          : skills.slice(0, Math.max(1, Math.round(skills.length * (calculatedOverall / 100)))),
        missingCompetencies: Array.isArray(aiResult.data.missingCompetencies) && aiResult.data.missingCompetencies.length
          ? aiResult.data.missingCompetencies
          : ['Complex scale resilience & edge-case recovery'],
        skills: Array.isArray(aiResult.data.skills) && aiResult.data.skills.length
          ? aiResult.data.skills.map(s => ({
              ...s,
              score: parseScore(s.score, calculatedOverall)
            }))
          : skills.map(s => ({
              skill: s,
              score: calculatedOverall,
              category: 'Core Competency',
              feedback: `Demonstrated technical understanding calibrated at ${calculatedOverall}%.`,
              strengths: ['Direct response structure'],
              gaps: ['Explore more resilient failover mechanisms']
            })),
        strengths: Array.isArray(aiResult.data.strengths) && aiResult.data.strengths.length
          ? aiResult.data.strengths
          : (calculatedOverall >= 75 ? ['Clear problem decomposition', 'Solid domain knowledge'] : ['Honest communication of knowledge boundaries']),
        areasToImprove: Array.isArray(aiResult.data.areasToImprove) && aiResult.data.areasToImprove.length
          ? aiResult.data.areasToImprove
          : (calculatedOverall < 75 ? ['Deepen concrete failure-mode reasoning', 'Elaborate on production scale trade-offs'] : ['Expand on multi-region latency optimizations']),
        communicationScore: commScore,
        technicalDepthScore: techDepth,
        problemSolvingScore: probScore,
        structureScore: structScore,
        questionResults: mappedQuestionResults
      };

      return NextResponse.json({
        success: true,
        evaluation: report
      });
    }

    // Heuristic fallback report when no API key is provided or offline
    const questionScores = responses.map((r, idx) => {
      const ev = evidences.find(e => e.questionId === r.questionId);
      return ev?.score !== undefined ? parseScore(ev.score, 0) : 0;
    });

    const directOverallScore = calculateOverallScore(
      questionScores.length ? questionScores : [0]
    );
    const fallbackVerdict = getVerdictFromScore(directOverallScore);
    const fallbackPercentile = calculatePercentile(directOverallScore);

    const fallbackSkills: SkillScore[] = skills.length
      ? skills.map((skillName, idx) => {
          const matchingScore = questionScores[idx % questionScores.length] ?? directOverallScore;
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
        })
      : [
          {
            skill: 'Technical Architecture',
            score: directOverallScore,
            category: 'System Design',
            feedback: `Evaluated candidate performance at ${directOverallScore}%.`,
            strengths: ['Structured thinking'],
            gaps: ['Production edge cases']
          }
        ];

    const synthesizedReport: InterviewEvaluation = {
      id: `eval-${Date.now()}`,
      role,
      company,
      date: 'Just now',
      overallScore: directOverallScore,
      verdict: fallbackVerdict,
      percentile: fallbackPercentile,
      jdAlignmentScore: Math.min(98, Math.max(20, Math.round(directOverallScore * 0.95))),
      summary: directOverallScore >= 80
        ? `Candidate demonstrated strong technical competency across questions, articulating practical tradeoffs and architecture mechanics.`
        : directOverallScore >= 60
        ? `Candidate showed satisfactory foundational knowledge but missed opportunities on failure modes and scaling tradeoffs.`
        : `Candidate showed significant technical gaps and struggled to explain core architectural mechanisms and recovery patterns.`,
      matchedRequirements: directOverallScore >= 60 ? skills : skills.slice(0, 1),
      missingCompetencies: directOverallScore < 75
        ? ['In-depth failure mode analysis', 'High-scale throughput optimization']
        : ['Secondary distributed failover nuances'],
      skills: fallbackSkills,
      strengths: directOverallScore >= 75
        ? ['Clear technical articulation', 'Structured reasoning on trade-offs']
        : ['Transparent identification of knowledge limits'],
      areasToImprove: directOverallScore >= 75
        ? ['Elaborate on edge-case telemetry and monitoring']
        : ['Deepen understanding of core architectural mechanics', 'Explain why specific technologies are chosen beyond buzzwords'],
      communicationScore: Math.min(100, Math.max(30, directOverallScore + 2)),
      technicalDepthScore: directOverallScore,
      problemSolvingScore: directOverallScore,
      structureScore: Math.min(100, Math.max(30, directOverallScore - 1)),
      questionResults: responses.length
        ? responses.map((r, idx) => {
            const q = questions.find(item => item.id === r.questionId) || questions[idx];
            const ev = evidences.find(e => e.questionId === r.questionId);
            const qScore = ev?.score !== undefined ? ev.score : directOverallScore;
            return {
              questionNumber: idx + 1,
              topic: r.skill || q?.topic || 'Architecture',
              question: r.question || q?.question || 'Technical scenario',
              candidateSummary: r.notes || r.answer || 'Candidate presented structured response.',
              rawAnswer: r.answer || r.notes || undefined,
              notes: r.notes || undefined,
              score: qScore,
              difficulty: r.questionDifficulty || q?.difficulty || 'Medium',
              keyPointsDemonstrated: ev?.demonstratedKnowledge?.length ? ev.demonstratedKnowledge : ['Baseline technical concepts'],
              missedOpportunities: ev?.missingKnowledge?.length ? ev.missingKnowledge : ['Deep failure modes and trade-off justification'],
              aiNote: ev?.followUpRecommendation || (qScore >= 75 ? 'Candidate demonstrated practical competence.' : 'Candidate demonstrated limited technical depth on this topic.')
            };
          })
        : MOCK_EVALUATION_DATA.questionResults
    };

    return NextResponse.json({
      success: true,
      evaluation: synthesizedReport,
      note: aiResult.isMockFallback
        ? 'Report synthesized via adaptive session aggregator (Configure OPENAI_API_KEY for dynamic LLM evaluation)'
        : undefined
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate assessment report';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
