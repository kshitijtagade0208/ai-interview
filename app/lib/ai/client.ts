/**
 * Server-only LLM client abstraction for InterviewAI.
 * Compatible with standard OpenAI API format, custom endpoints (Groq, OpenRouter, DeepSeek),
 * or direct Google Gemini endpoints.
 */

interface GenerateAIOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface AIClientResponse<T = unknown> {
  success: boolean;
  data?: T;
  rawText?: string;
  error?: string;
  isMockFallback?: boolean;
}

/**
 * Cleanly extract and parse JSON from LLM output, handling markdown code blocks,
 * reasoning wrappers, and surrounding text.
 */
export function extractJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown code block wrappers if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find first { and last } or first [ and last ]
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Known fallback models to attempt if the configured model is unavailable (404).
 */
const KNOWN_CHAT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'gpt-4o-mini',
  'llama3-70b-8192'
];

/**
 * Universal Server-Side AI Completion Generator
 */
export async function generateAIResponse<T = unknown>(
  options: GenerateAIOptions
): Promise<AIClientResponse<T>> {
  const {
    systemPrompt,
    userPrompt,
    temperature = 0.3,
    jsonMode = true,
    timeoutMs = 25000
  } = options;

  const openAiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
  const configuredModel = process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile';

  // Check if any API key is configured
  if (!openAiApiKey && !geminiApiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[InterviewAI Client] No OPENAI_API_KEY or GEMINI_API_KEY detected. Using fallback.');
    }
    return {
      success: false,
      error: 'NO_API_KEY_CONFIGURED',
      isMockFallback: true
    };
  }

  // Primary: OpenAI-compatible endpoint (Groq, OpenAI, OpenRouter, etc.)
  if (openAiApiKey) {
    const modelsToTry = [configuredModel, ...KNOWN_CHAT_MODELS.filter(m => m !== configuredModel)];

    for (const modelToUse of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiApiKey}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          // If model not found (404), try next model in fallback list
          if (response.status === 404 && modelsToTry.indexOf(modelToUse) < modelsToTry.length - 1) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[InterviewAI Client] Model "${modelToUse}" returned 404. Trying next fallback model...`);
            }
            continue;
          }

          if (process.env.NODE_ENV !== 'production') {
            console.error(`[InterviewAI Client] Provider Error (${response.status}):`, errorBody.slice(0, 300));
          }

          return {
            success: false,
            error: `LLM Provider Error (${response.status}): ${errorBody.slice(0, 200)}`
          };
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content || '';

        if (jsonMode) {
          const parsed = extractJSON<T>(content);
          return { success: true, data: parsed, rawText: content };
        }

        return { success: true, rawText: content, data: content as unknown as T };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errorMessage = err instanceof Error ? err.message : 'Unknown AI request failure';
        
        // If aborted or timeout, don't loop endlessly
        if (errorMessage.includes('aborted')) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[InterviewAI Client] Request timed out after', timeoutMs, 'ms');
          }
          return {
            success: false,
            error: `LLM request timed out after ${Math.round(timeoutMs / 1000)}s`
          };
        }

        if (process.env.NODE_ENV !== 'production') {
          console.error('[InterviewAI Client] Exception during AI generation:', errorMessage);
        }

        return {
          success: false,
          error: errorMessage
        };
      }
    }
  }

  // Secondary: Direct Google Gemini REST endpoint
  if (geminiApiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const geminiModel = 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature,
            ...(jsonMode ? { responseMimeType: 'application/json' } : {})
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Gemini API Error (${response.status}): ${errorBody.slice(0, 200)}`
        };
      }

      const json = await response.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (jsonMode) {
        const parsed = extractJSON<T>(content);
        return { success: true, data: parsed, rawText: content };
      }

      return { success: true, rawText: content, data: content as unknown as T };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error ? err.message : 'Unknown AI request failure';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  return {
    success: false,
    error: 'No valid AI provider client matched.'
  };
}
