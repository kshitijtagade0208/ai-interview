import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '../../../lib/ai/client';
import { SYLLABUS_PLANNER_SYSTEM_PROMPT } from '../../../lib/ai/prompts';
import { QuestionData } from '../../../types/interview';
import { generateDynamicFallbackQuestions } from '../../../data/mockData';

interface GenerateSyllabusRequestBody {
  role?: string;
  jobDescription?: string;
  skills?: string[];
  difficulty?: string;
  duration?: number;
}

interface SyllabusResponseData {
  skillsToTest: string[];
  initialQuestions: Array<{
    id: number;
    skill: string;
    topic: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced';
    timeLimitSeconds?: number;
    question: string;
    codeSnippet?: string;
    questionIntent?: string;
    hints: string[];
    expectedKeyPoints: string[];
    potentialFollowUps?: string[];
  }>;
  interviewOverview?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateSyllabusRequestBody = await req.json();
    const {
      role = 'AI Engineer',
      jobDescription = '',
      skills = ['Python', 'LLMs', 'RAG', 'LangChain', 'APIs', 'Vector Databases'],
      difficulty = 'adaptive',
      duration = 30
    } = body;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[InterviewAI /generate-syllabus REQUEST]', {
        role,
        selectedSkills: skills,
        jobDescription: jobDescription || '(none provided)',
        difficulty,
        duration
      });
    }

    const userPrompt = `Generate a realistic 4-question adaptive technical interview plan for the following candidate configuration:
Target Role: ${role}
Difficulty Tier: ${difficulty}
Duration: ${duration} minutes
Target Skills: ${skills.join(', ')}

Job Description:
"""
${jobDescription || `Standard requirements and architectural expectations for a ${role}`}
"""

CRITICAL INSTRUCTIONS:
1. Question Style: Ask concise, conversational questions (2 to 4 sentences max). Ask ONE question at a time. Do not write long essay prompts.
2. Question Variety:
   - Question 1 (Core Domain): A high-signal architectural or trade-off question focused on the candidate's primary competency (${skills.slice(0, 2).join(', ') || role}).
   - Question 2 (Debugging / Concurrency): A realistic Python/backend/API debugging or concurrency scenario (request code only if genuinely needed).
   - Question 3 (Data / Scalability): A practical vector database, caching, or indexing trade-off question.
   - Question 4 (Production Resilience): An unexpected real-world failure mode, rate-limiting incident, or practical system decision.
3. Realistic & Practical: Frame problems around real production trade-offs and decisions rather than textbook definitions.`;

    const aiResult = await generateAIResponse<SyllabusResponseData>({
      systemPrompt: SYLLABUS_PLANNER_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
      jsonMode: true
    });

    if (aiResult.success && aiResult.data?.initialQuestions?.length) {
      // Map to QuestionData[]
      const questions: QuestionData[] = aiResult.data.initialQuestions.map((q, idx) => ({
        id: idx + 1,
        title: q.title || `${q.skill}: Technical Deep-Dive`,
        topic: q.topic || q.skill,
        difficulty: q.difficulty || (difficulty === 'advanced' ? 'Advanced' : difficulty === 'beginner' ? 'Easy' : 'Medium'),
        timeLimitSeconds: q.timeLimitSeconds || 300,
        question: q.question,
        codeSnippet: q.codeSnippet,
        hints: q.hints || ['Consider performance trade-offs', 'Consider edge cases and concurrency'],
        expectedKeyPoints: q.expectedKeyPoints || ['Clear architectural explanation']
      }));

      if (process.env.NODE_ENV !== 'production') {
        console.log('[InterviewAI /generate-syllabus RESPONSE]', {
          generatedQuestionTopic: questions[0]?.topic,
          questionText: questions[0]?.question,
          sourceProvider: 'Groq / LLM'
        });
      }

      return NextResponse.json({
        success: true,
        questions,
        skillsToTest: aiResult.data.skillsToTest || skills,
        interviewOverview: aiResult.data.interviewOverview
      });
    }

    // Dynamic Fallback if LLM is unavailable or an error occurred
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[InterviewAI] LLM generation did not produce questions (${aiResult.error || 'Empty response'}). Using dynamic role/skill fallback generator.`);
    }

    const fallbackQuestions: QuestionData[] = generateDynamicFallbackQuestions(
      role,
      skills,
      difficulty,
      jobDescription
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('[InterviewAI /generate-syllabus RESPONSE]', {
        generatedQuestionTopic: fallbackQuestions[0]?.topic,
        questionText: fallbackQuestions[0]?.question,
        sourceProvider: 'Dynamic Role-Calibrated Generator'
      });
    }

    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      skillsToTest: skills,
      note: aiResult.isMockFallback
        ? 'Using dynamic role-calibrated fallback syllabus (Configure OPENAI_API_KEY for dynamic LLM generation)'
        : undefined
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate interview syllabus';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[InterviewAI] Error in /generate-syllabus route:', message);
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
