const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim();
    if (k) env[k] = v;
  }
});

const baseUrl = env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
const apiKey = env.OPENAI_API_KEY;
const model = 'openai/gpt-oss-120b';

async function test() {
  const systemPrompt = `You are an expert technical interviewer conducting a realistic adaptive interview.

CRITICAL SYLLABUS PLANNING RULES:
1. Core Domain Priority: Question 1 MUST directly test the primary domain of the target role and the highest-signal requested skill.
   - For AI Engineer / LLM / RAG roles (skills: Python, LLMs, RAG, LangChain, APIs, Vector Databases): Question 1 MUST test core AI architecture (e.g., End-to-end RAG pipeline, embedding chunking & retrieval, vector database indexing, LLM agent design, or hallucination mitigation). Do NOT start with generic data scraping, basic loops, or non-AI streaming pipelines unless explicitly requested by the JD.
2. Skill Fidelity: Never generate questions based on default presets or unrelated technologies. Every question must be grounded in the candidate's active role, selected skills, and job description.
3. Realistic Production Scenarios: Frame questions as concrete system problems with real-world trade-offs, constraints, and architecture decisions.

Return your response strictly as valid JSON matching this schema:
{
  "skillsToTest": ["string"],
  "initialQuestions": [
    {
      "id": 1,
      "skill": "string",
      "topic": "string",
      "title": "string",
      "difficulty": "Easy" | "Medium" | "Hard" | "Adaptive High" | "Advanced",
      "timeLimitSeconds": 300,
      "question": "string",
      "hints": ["string"],
      "expectedKeyPoints": ["string"],
      "potentialFollowUps": ["string"]
    }
  ],
  "interviewOverview": "string"
}`;

  const role = 'AI Engineer';
  const skills = ['Python', 'LLMs', 'RAG', 'LangChain', 'APIs', 'Vector Databases'];
  const jobDescription = '';
  const difficulty = 'adaptive';
  const duration = 30;

  const userPrompt = `Generate a compact adaptive technical interview plan for the following candidate configuration:
Target Role: ${role}
Difficulty Tier: ${difficulty}
Duration: ${duration} minutes
Target Skills: ${skills.join(', ')}

Job Description:
"""
${jobDescription || `Standard requirements and architectural expectations for a ${role}`}
"""

CRITICAL INSTRUCTIONS:
1. Every initial question MUST be concrete and directly focused on the target role (${role}) and the specified target skills (${skills.join(', ')}).
2. Question 1 MUST test core AI/LLM/RAG capabilities (e.g. RAG architecture, vector search, embedding retrieval, LangChain agents).
3. Do NOT start with generic streaming APIs, payment endpoints, or non-AI data ingestion problems.`;

  console.log('[InterviewAI /generate-syllabus Payload]', {
    role,
    selectedSkills: skills,
    jobDescription: jobDescription || '(none provided)',
    difficulty,
    duration
  });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(raw);
  console.log('\n--- Generated Syllabus ---');
  console.log('Overview:', parsed.interviewOverview);
  parsed.initialQuestions.forEach((q, i) => {
    console.log(`\n[Question ${i+1}] Skill: ${q.skill} | Topic: ${q.topic} | Title: "${q.title}"`);
    console.log(`Question text: ${q.question}`);
  });
}

test().catch(console.error);
