import {
  SkillItem,
  RecentInterview,
  QuestionData,
  InterviewEvaluation,
  InterviewConfig
} from '../types/interview';

export const INITIAL_SKILLS: SkillItem[] = [
  { id: '1', name: 'TypeScript & JavaScript', category: 'frontend', level: 92, verified: true },
  { id: '2', name: 'React & Next.js 15/16', category: 'frontend', level: 90, verified: true },
  { id: '3', name: 'Distributed Systems & Microservices', category: 'system-design', level: 85, verified: true },
  { id: '4', name: 'Node.js & Express / Fastify', category: 'backend', level: 88, verified: true },
  { id: '5', name: 'PostgreSQL & SQL Optimization', category: 'backend', level: 82, verified: false },
  { id: '6', name: 'Redis Caching & Pub/Sub', category: 'backend', level: 78, verified: true },
  { id: '7', name: 'Docker & Kubernetes (K8s)', category: 'devops', level: 74, verified: false },
  { id: '8', name: 'REST & GraphQL API Design', category: 'backend', level: 91, verified: true },
  { id: '9', name: 'System Scalability & Sharding', category: 'system-design', level: 80, verified: true },
  { id: '10', name: 'LLM Prompt Engineering & RAG', category: 'ai-ml', level: 86, verified: true },
  { id: '11', name: 'Cloud Architecture (AWS/GCP)', category: 'devops', level: 79, verified: false },
  { id: '12', name: 'Technical Communication', category: 'soft-skills', level: 94, verified: true }
];

export const AVAILABLE_SKILL_SUGGESTIONS = [
  'TypeScript', 'React.js', 'Next.js', 'Node.js', 'Python', 'Go (Golang)',
  'System Design', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes',
  'AWS', 'GraphQL', 'Microservices', 'CI/CD Pipelines', 'Distributed Caching',
  'FastAPI', 'Elasticsearch', 'WebSockets', 'Tailwind CSS', 'RAG Pipelines'
];

export const RECENT_INTERVIEWS: RecentInterview[] = [
  {
    id: 'int-001',
    role: 'Staff Full-Stack & Systems Engineer',
    companyTarget: 'Stripe',
    date: 'Yesterday, 4:30 PM',
    durationMinutes: 45,
    overallScore: 88,
    verdict: 'Strong Hire',
    difficulty: 'adaptive',
    jdMatchScore: 92,
    skillsAssessed: ['System Design', 'Distributed Caching', 'TypeScript', 'Event-Driven Architecture']
  },
  {
    id: 'int-002',
    role: 'Senior Backend Platform Engineer',
    companyTarget: 'Cloudflare',
    date: 'Oct 4, 2026',
    durationMinutes: 30,
    overallScore: 84,
    verdict: 'Hire',
    difficulty: 'advanced',
    jdMatchScore: 86,
    skillsAssessed: ['Go (Golang)', 'Edge Compute', 'Concurrency', 'PostgreSQL']
  },
  {
    id: 'int-003',
    role: 'Lead Frontend Architect',
    companyTarget: 'Vercel / Next.js',
    date: 'Sep 29, 2026',
    durationMinutes: 45,
    overallScore: 94,
    verdict: 'Strong Hire',
    difficulty: 'adaptive',
    jdMatchScore: 96,
    skillsAssessed: ['React 19 & Next.js', 'Performance Profiling', 'Web Vitals', 'State Management']
  },
  {
    id: 'int-004',
    role: 'AI Systems Engineer (RAG & Agents)',
    companyTarget: 'Anthropic',
    date: 'Sep 20, 2026',
    durationMinutes: 30,
    overallScore: 78,
    verdict: 'Lean Hire',
    difficulty: 'advanced',
    jdMatchScore: 81,
    skillsAssessed: ['Vector Databases', 'Prompt Engineering', 'Python', 'Latency Optimization']
  }
];

export const SAMPLE_JOB_DESCRIPTIONS = [
  {
    title: 'Senior Full Stack Engineer (FinTech Platform)',
    company: 'Stripe',
    role: 'Senior Full Stack Engineer',
    skills: ['TypeScript', 'React.js', 'Node.js', 'System Design', 'PostgreSQL', 'Redis', 'Kafka'],
    text: `About the Role:
We are looking for a Senior Full Stack Engineer to lead the architecture and development of our next-generation global payouts platform. You will build high-throughput, low-latency financial systems with 99.999% uptime guarantees.

Requirements:
- 5+ years of production experience building high-scale distributed web applications.
- Strong proficiency in TypeScript, React, Node.js, and modern async patterns.
- Deep understanding of relational databases (PostgreSQL), schema design, transaction isolation, and caching strategies (Redis).
- Experience designing resilient idempotent REST/GraphQL APIs and event-driven architectures (Kafka/RabbitMQ).
- Strong communication skills, architectural trade-off reasoning, and ownership mindset.`
  },
  {
    title: 'Distributed Systems & Backend Lead',
    company: 'Cloudflare',
    role: 'Staff Backend Engineer',
    skills: ['Go (Golang)', 'System Design', 'Distributed Caching', 'PostgreSQL', 'Docker', 'Kubernetes'],
    text: `About the Role:
Join our Edge Core team to design and scale ultra-low-latency distributed storage and compute engines serving millions of RPS across 300+ global data centers.

Requirements:
- Solid expertise in Go or Rust with deep knowledge of memory management, concurrency primitives (goroutines, channels, sync), and networking protocols.
- Hands-on experience scaling distributed key-value stores, consensus protocols (Raft/Paxos), and partition tolerance.
- Ability to dissect complex architectural trade-offs under high-concurrency loads.`
  },
  {
    title: 'AI Platform & Prompt Engineer',
    company: 'Anthropic',
    role: 'AI Infrastructure Engineer',
    skills: ['Python', 'RAG Pipelines', 'Vector Databases', 'FastAPI', 'System Design', 'AWS'],
    text: `About the Role:
We are seeking an AI Infrastructure Engineer to design robust evaluation harnesses, RAG data ingestion pipelines, and low-latency inference proxies for enterprise LLM workloads.

Requirements:
- Strong engineering fundamentals in Python/TypeScript, asynchronous IO, and containerized deployment.
- Experience with embedding models, vector indexing (Pinecone/Milvus/pgvector), and semantic reranking.
- Proven track record of evaluating LLM reliability, prompt drift, and latency-accuracy trade-offs.`
  }
];

export const DEFAULT_CONFIG: InterviewConfig = {
  targetRole: 'AI Engineer',
  companyName: '',
  jobDescription: '',
  selectedSkills: ['Python', 'LLMs', 'RAG', 'LangChain', 'APIs', 'Vector Databases'],
  difficulty: 'adaptive',
  duration: 30,
  focusAreas: ['RAG Pipeline Architecture', 'Vector Search & Indexing', 'LLM Agent Design', 'API Integration']
};

export const MOCK_INTERVIEW_QUESTIONS: QuestionData[] = [
  {
    id: 1,
    title: 'RAG Chunking Strategy & Semantic Retrieval',
    topic: 'Retrieval-Augmented Generation (RAG)',
    difficulty: 'Medium',
    timeLimitSeconds: 300,
    question: `When designing a RAG pipeline over technical documentation, how do you decide between fixed-size chunking versus document-aware semantic chunking? What trade-offs emerge between retrieval accuracy and query latency?`,
    hints: [
      'Think about document hierarchy, headers, and code block boundaries.',
      'How does chunk size affect embedding density and LLM context limits?'
    ],
    expectedKeyPoints: [
      'Trade-offs between fixed-size and semantic chunking',
      'Contextual boundary preservation and metadata filtering',
      'Impact of chunk size on embedding retrieval precision'
    ]
  },
  {
    id: 2,
    title: 'Python Async Concurrency & Gateway Debugging',
    topic: 'FastAPI & Async IO',
    difficulty: 'Medium',
    timeLimitSeconds: 300,
    question: `In a FastAPI inference gateway handling high concurrent traffic, clients report intermittent 504 gateway timeouts even though CPU utilization remains below 25%. What are the first three things you investigate in the async event loop and connection pool?`,
    hints: [
      'Consider blocking synchronous calls inside async def endpoints.',
      'How do upstream HTTP connection pool limits impact concurrency?'
    ],
    expectedKeyPoints: [
      'Detecting blocking synchronous calls inside the event loop',
      'HTTP client connection pool saturation and connection reuse',
      'Thread pool executor starvation for background tasks'
    ]
  },
  {
    id: 3,
    title: 'Vector Database Scalability & Memory Trade-offs',
    topic: 'Vector Databases',
    difficulty: 'Adaptive High',
    timeLimitSeconds: 300,
    question: `As your vector dataset grows from 500k to 20 million vectors, RAM costs become prohibitive. How do you weigh HNSW index performance against Product Quantization (IVF-PQ) or disk-backed search (DiskANN)?`,
    hints: [
      'Compare memory footprint of raw vector embeddings vs compressed representations.',
      'What happens to recall accuracy and search latency under quantization?'
    ],
    expectedKeyPoints: [
      'Memory reduction via Product Quantization (PQ)',
      'Recall trade-offs between exact graph search vs quantized index',
      'Tenant partitioning or metadata sharding strategies'
    ]
  },
  {
    id: 4,
    title: 'Autonomous Agent Loop Break & Failure Recovery',
    topic: 'LLM Agents & Tool Use',
    difficulty: 'Advanced',
    timeLimitSeconds: 300,
    question: `An autonomous LangChain research agent gets stuck in a repetitive tool-calling loop when an external search API returns empty results. How would you design guardrails and deterministic escape conditions to recover gracefully?`,
    hints: [
      'Think about maximum step counts, cycle detection, and fallback prompt strategies.',
      'How can state checkpointing help the agent backtrack?'
    ],
    expectedKeyPoints: [
      'Cycle detection and step budget guardrails',
      'Graceful degradation prompt injection when tool output is empty',
      'Structured validation and state rollback mechanisms'
    ]
  }
];

export const MOCK_EVALUATION_DATA: InterviewEvaluation = {
  id: 'eval-ai-001',
  role: 'AI Engineer',
  company: 'AI Systems Platform',
  date: 'Today, 5:15 PM',
  overallScore: 92,
  verdict: 'Strong Hire',
  percentile: 96,
  jdAlignmentScore: 94,
  matchedRequirements: [
    'RAG Pipeline & Vector Indexing Architecture',
    'LangChain Agent Tool-Use & State Management',
    'Vector Database Scalability & Quantization',
    'FastAPI Async Streaming Gateway',
    'Hallucination Mitigation & Guardrails'
  ],
  missingCompetencies: [
    'Fine-tuning custom LoRA adapter checkpoints (minor)'
  ],
  summary: `The candidate demonstrated exceptional technical depth across end-to-end RAG architecture, vector indexing algorithms, and asynchronous LLM streaming pipelines. Explanations were clear, structured with tradeoff awareness (accuracy vs latency vs memory footprint), and directly aligned with modern AI Engineering expectations.`,
  skills: [
    {
      skill: 'RAG & Vector Search Architecture',
      score: 95,
      category: 'AI / ML Engineering',
      feedback: 'Outstanding breakdown of semantic chunking, HNSW vector indexing, and cross-encoder reranking with hallucination guardrails.',
      strengths: ['Clear chunking strategy', 'Hybrid search synthesis', 'Hallucination detection'],
      gaps: ['Could have touched slightly more on multi-lingual embedding nuances.']
    },
    {
      skill: 'LangChain & Agentic Workflows',
      score: 90,
      category: 'LLM Orchestration',
      feedback: 'Solid design of ReAct cyclic tool execution loops with Pydantic structured output validation and error fallbacks.',
      strengths: ['Deterministic output parsing', 'State checkpointing', 'Loop break conditions'],
      gaps: ['Mentioned dynamic tool pruning but did not detail token budget optimizations.']
    },
    {
      skill: 'Vector Database Scalability',
      score: 91,
      category: 'Data Infrastructure',
      feedback: 'Strong grasp of IVF-PQ and HNSW trade-offs for scaling beyond 50M embeddings.',
      strengths: ['Deep quantization awareness', 'Metadata tenant partitioning', 'Memory cache optimization'],
      gaps: ['None major. Highly practical knowledge.']
    },
    {
      skill: 'FastAPI & Async Serving',
      score: 92,
      category: 'Backend / APIs',
      feedback: 'Clean async generator design for Server-Sent Events (SSE) with decoupled background telemetry queues.',
      strengths: ['Sub-50ms TTFT architecture', 'Non-blocking backpressure', 'Token bucket rate-limiting'],
      gaps: ['Could have detailed GPU batch scheduling metrics.']
    }
  ],
  strengths: [
    'Extremely strong practical knowledge of enterprise RAG and vector database indexing.',
    'Clear architectural thinking: always weighed retrieval recall vs latency vs memory footprint.',
    'Proactive communication and structured answers that mirror real Staff AI Engineer discussions.',
    'Deep understanding of agentic state loops and error recovery.'
  ],
  areasToImprove: [
    'Elaborate on fine-tuning embedding models for specialized domain jargon.',
    'Discuss speculative decoding and KV-cache optimization for local LLM inference.'
  ],
  communicationScore: 94,
  technicalDepthScore: 93,
  problemSolvingScore: 91,
  structureScore: 92,
  questionResults: [
    {
      questionNumber: 1,
      topic: 'Retrieval-Augmented Generation (RAG)',
      question: 'Design an enterprise RAG service over a 10M document corpus with vector indexing & guardrails.',
      candidateSummary: 'Candidate outlined a complete pipeline: semantic chunking with 64-token overlap, HNSW indexing in pgvector/Pinecone, BM25 hybrid search with cross-encoder reranking, and self-consistency hallucination checks before streaming output.',
      score: 96,
      difficulty: 'Medium',
      keyPointsDemonstrated: [
        'Document chunking strategy with metadata preservation',
        'Vector indexing and similarity metric choice (HNSW Cosine)',
        'Hybrid search and contextual cross-encoder reranking',
        'Grounding prompts and hallucination detection mechanisms'
      ],
      missedOpportunities: [
        'Could have briefly touched on document update tombstone replication.'
      ],
      aiNote: 'Answer exceeded standard expectations; candidate brought up cross-encoder reranking unprompted.'
    },
    {
      questionNumber: 2,
      topic: 'Autonomous LLM Agents',
      question: 'Design an autonomous LLM agent with LangChain / LangGraph for multi-step research tasks.',
      candidateSummary: 'Detailed a LangGraph cyclic state machine with Pydantic tool schemas, execution checkpoints, and exponential retry backoff on API timeouts.',
      score: 90,
      difficulty: 'Adaptive High',
      keyPointsDemonstrated: [
        'Agentic workflow design with tool schemas and execution loops',
        'State persistence and checkpointing across reasoning steps',
        'Handling API failure modes, rate limits, and fallback paths',
        'Context window memory management and message truncation'
      ],
      missedOpportunities: [
        'Did not explicitly detail tool response caching.'
      ],
      aiNote: 'Strong systems thinking. Well-aligned with modern production agent patterns.'
    },
    {
      questionNumber: 3,
      topic: 'Vector Databases & Similarity Search',
      question: 'Explain trade-offs between indexing algorithms (HNSW vs IVF-PQ) at 50M vector scale.',
      candidateSummary: 'Compared memory consumption of raw embeddings vs IVF-PQ and DiskANN. Recommended metadata tenant sharding to maintain sub-10ms query latency.',
      score: 91,
      difficulty: 'Adaptive High',
      keyPointsDemonstrated: [
        'HNSW graph index structure vs Inverted File Product Quantization (IVF-PQ)',
        'Memory management and quantization trade-offs (precision vs latency)',
        'Sharding by metadata or document tenant for multi-tenant scaling',
        'Caching hot embeddings and query results'
      ],
      missedOpportunities: [
        'Could have touched on dynamic recall adjustment.'
      ],
      aiNote: 'Showed comprehensive practical mastery of vector indexing algorithms.'
    },
    {
      questionNumber: 4,
      topic: 'FastAPI & Async LLM Serving',
      question: 'Architect an async Python gateway for streaming SSE tokens with sub-50ms TTFT.',
      candidateSummary: 'Explained FastAPI async generator with SSE StreamingResponse, Redis token bucket rate limiting, and async background queues for evaluation telemetry.',
      score: 92,
      difficulty: 'Advanced',
      keyPointsDemonstrated: [
        'FastAPI async generator with Server-Sent Events (SSE)',
        'Connection pooling, HTTP/2 multiplexing, and async back-pressure',
        'Token bucket rate limiting using Redis atomic counters',
        'Decoupled asynchronous logging via background queues'
      ],
      missedOpportunities: [
        'Tail-based latency monitoring was briefly omitted.'
      ],
      aiNote: 'Clean architecture. Strong concurrency and streaming fundamentals.'
    }
  ]
};

/**
 * Dynamically synthesizes questions tailored to the candidate's exact role and selected skills
 * if external AI services are unreachable.
 */
export function generateDynamicFallbackQuestions(
  role: string,
  skills: string[],
  difficulty: string = 'adaptive',
  jobDescription: string = ''
): QuestionData[] {
  const targetSkills = skills.length ? [...skills] : ['RAG Architecture', 'LLM Agent Design', 'Vector Databases', 'Python'];

  // Prioritize core AI/ML competencies (e.g. RAG, Vector DB, LLMs, LangChain) for AI roles
  const isAIRole = /ai|machine learning|llm|deep learning|data science/i.test(role);
  if (isAIRole) {
    targetSkills.sort((a, b) => {
      const aIsCore = /rag|vector|llm|langchain|prompt|embedding/i.test(a);
      const bIsCore = /rag|vector|llm|langchain|prompt|embedding/i.test(b);
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      return 0;
    });
  }

  return targetSkills.map((skill, idx) => {
    const diffTier: 'Easy' | 'Medium' | 'Hard' | 'Adaptive High' | 'Advanced' =
      difficulty === 'advanced' ? 'Advanced' : difficulty === 'beginner' ? 'Easy' : idx === 0 ? 'Medium' : 'Adaptive High';

    const sLower = skill.toLowerCase();

    if (sLower.includes('rag') || sLower.includes('embedding')) {
      return {
        id: idx + 1,
        title: `${skill}: Chunking & Semantic Search`,
        topic: skill,
        difficulty: diffTier,
        timeLimitSeconds: 300,
        question: `When building a ${skill} pipeline for a ${role} workflow, how do you handle document boundary preservation during chunking, and what techniques do you use to filter out irrelevant retrieved passages before generation?`,
        hints: [
          'Consider metadata tagging per chunk and contextual headers.',
          'How does cross-encoder reranking or relevance score thresholding help?'
        ],
        expectedKeyPoints: [
          'Semantic chunking with contextual metadata',
          'Reranking and similarity threshold filtering',
          'Mitigating context dilution and hallucinations'
        ]
      };
    }

    if (sLower.includes('vector') || sLower.includes('database')) {
      return {
        id: idx + 1,
        title: `${skill}: Indexing & Latency Trade-offs`,
        topic: skill,
        difficulty: diffTier,
        timeLimitSeconds: 300,
        question: `In a production ${role} service, how do you balance search recall accuracy against memory consumption and query latency when indexing embeddings with ${skill}?`,
        hints: [
          'Compare graph-based indices (HNSW) with inverted file quantization (IVF-PQ).',
          'What caching strategies help reduce repeated embedding searches?'
        ],
        expectedKeyPoints: [
          'Vector index trade-offs (graph precision vs memory quantization)',
          'Query latency optimization and caching',
          'Sharding by user or tenant for scale'
        ]
      };
    }

    if (sLower.includes('llm') || sLower.includes('agent') || sLower.includes('langchain')) {
      return {
        id: idx + 1,
        title: `${skill}: Tool Calling & Error Recovery`,
        topic: skill,
        difficulty: diffTier,
        timeLimitSeconds: 300,
        question: `When deploying an autonomous ${skill} agent, how do you prevent infinite execution loops when an external API fails, and how do you ensure structured, deterministic responses?`,
        hints: [
          'Consider step limits, cycle detection, and fallback prompt injection.',
          'How does schema validation (Pydantic / JSON schema) guarantee output format?'
        ],
        expectedKeyPoints: [
          'Cycle detection and max step guardrails',
          'Deterministic schema validation (Pydantic)',
          'State persistence and graceful tool failure recovery'
        ]
      };
    }

    if (sLower.includes('python') || sLower.includes('fastapi') || sLower.includes('backend') || sLower.includes('api')) {
      return {
        id: idx + 1,
        title: `${skill}: Concurrency & Debugging`,
        topic: skill,
        difficulty: diffTier,
        timeLimitSeconds: 300,
        question: `In a ${role} backend built with ${skill}, how do you diagnose blocking synchronous operations inside an async event loop, and how do you configure connection pooling under burst traffic?`,
        hints: [
          'Look for synchronous CPU-bound blocks or non-async database drivers.',
          'How do connection pool max limits prevent socket exhaustion?'
        ],
        expectedKeyPoints: [
          'Identifying blocking IO vs async event loop stalls',
          'Connection pool tuning and keep-alive reuse',
          'Graceful back-pressure and error handling'
        ]
      };
    }

    if (sLower.includes('react') || sLower.includes('typescript') || sLower.includes('next') || sLower.includes('frontend')) {
      return {
        id: idx + 1,
        title: `${skill}: Performance & State Management`,
        topic: skill,
        difficulty: diffTier,
        timeLimitSeconds: 300,
        question: `When building a ${role} web application with ${skill}, how do you manage real-time streaming state and prevent unnecessary re-renders across deep component trees?`,
        hints: [
          'Consider state batching, memoization, and selective subtree subscription.',
          'How do you handle UI backpressure for fast-streaming tokens?'
        ],
        expectedKeyPoints: [
          'Strict type definitions and memoized selectors',
          'State decoupling for real-time streaming updates',
          'Render batching and component boundary isolation'
        ]
      };
    }

    // Default dynamic question tailored to the exact role and skill
    return {
      id: idx + 1,
      title: `${skill}: Architectural Trade-off`,
      topic: skill,
      difficulty: diffTier,
      timeLimitSeconds: 300,
      question: `As a ${role} working with ${skill}, what is a major technical trade-off or failure mode you recently had to design around, and why did you choose your specific approach?`,
      hints: [
        `Consider performance bottlenecks specific to ${skill}.`,
        'What telemetry or guardrails ensure reliability under load?'
      ],
      expectedKeyPoints: [
        `Clear understanding of ${skill} principles and practical trade-offs`,
        'Reasoning behind design decisions',
        'Production monitoring and failure recovery'
      ]
    };
  });
}

