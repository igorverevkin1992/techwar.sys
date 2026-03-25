import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AGENT_SCOUT_PROMPT, AGENT_LENS_PROMPT, AGENT_RESEARCH_PROMPT, AGENT_ARCHITECT_PROMPT, AGENT_ARCHITECT_DOCUMENTARY_PROMPT, AGENT_ARCHITECT_SHORT_DOC_PROMPT, AGENT_SCRIPTWRITER_PROMPT, AGENT_DOCUMENTARY_WRITER_PROMPT, AGENT_SHORT_DOC_WRITER_PROMPT, AGENT_SEO_PROMPT, AGENT_SCRIPT_REWRITER_PROMPT, AGENT_AUDIT_FIX_PROMPT, AGENT_OUTLINE_PROMPT, AGENT_DOC_OUTLINE_PROMPT, AGENT_SHORT_DOC_OUTLINE_PROMPT, AGENT_DOC_CIRCLE_PROMPT, AGENT_SHORT_DOC_CIRCLE_PROMPT, AGENT_ACT_PLANNING_PROMPT, AGENT_SHORT_DOC_ACT_PLANNING_PROMPT, CHARS_PER_SECOND, MIN_BLOCK_DURATION_SEC, IMAGE_GEN_MODEL, IMAGE_GEN_PROMPT_PREFIX, API_RETRY_COUNT, API_RETRY_BASE_DELAY_MS, AGENT_MODELS } from "../../constants";
import { getModel } from "../../appSettings";
import { ResearchDossier, ScriptBlock, TopicSuggestion, ProjectType, SeoPackage } from "../../types";
import { logger } from "../logger";

// Re-export imports needed by submodules
export { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold };
export { AGENT_SCOUT_PROMPT, AGENT_LENS_PROMPT, AGENT_RESEARCH_PROMPT, AGENT_ARCHITECT_PROMPT, AGENT_ARCHITECT_DOCUMENTARY_PROMPT, AGENT_ARCHITECT_SHORT_DOC_PROMPT, AGENT_SCRIPTWRITER_PROMPT, AGENT_DOCUMENTARY_WRITER_PROMPT, AGENT_SHORT_DOC_WRITER_PROMPT, AGENT_SEO_PROMPT, AGENT_SCRIPT_REWRITER_PROMPT, AGENT_AUDIT_FIX_PROMPT, AGENT_OUTLINE_PROMPT, AGENT_DOC_OUTLINE_PROMPT, AGENT_SHORT_DOC_OUTLINE_PROMPT, AGENT_DOC_CIRCLE_PROMPT, AGENT_SHORT_DOC_CIRCLE_PROMPT, AGENT_ACT_PLANNING_PROMPT, AGENT_SHORT_DOC_ACT_PLANNING_PROMPT, CHARS_PER_SECOND, MIN_BLOCK_DURATION_SEC, IMAGE_GEN_MODEL, IMAGE_GEN_PROMPT_PREFIX, API_RETRY_COUNT, API_RETRY_BASE_DELAY_MS, AGENT_MODELS };
export { getModel };
export type { ResearchDossier, ScriptBlock, TopicSuggestion, ProjectType, SeoPackage };
export { logger };

// API client factory.
// Proxy mode (recommended): set VITE_USE_PROXY=true in .env
//   → All calls go through FastAPI at VITE_BACKEND_URL, API key stays on server.
//   → Backend must have GOOGLE_API_KEY in its environment.
// Direct mode (default): VITE_GOOGLE_API_KEY is used directly from browser.
//   → Key is exposed in the client bundle (acceptable for local personal use).
export const getClient = () => {
  const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
  if (useProxy) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
    // Route through FastAPI proxy — real key is added by backend, never sent to browser.
    return new GoogleGenAI({
      apiKey: "proxy",
      httpOptions: { baseUrl: `${backendUrl}/api/gemini` }
    });
  }
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("API Key missing. Set VITE_GOOGLE_API_KEY (direct) or VITE_USE_PROXY=true (backend proxy).");
  }
  return new GoogleGenAI({ apiKey });
};

// --- STYLE RETRIEVAL HELPER ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export async function fetchHarrisStyle(topic: string, k = 3): Promise<string> {
  try {
    logger.info(`📡 Запрашиваем стиль Johnny Harris для темы: "${topic}" (k=${k})...`);
    const response = await fetch(`${BACKEND_URL}/api/get-harris-style`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, k })
    });

    if (response.ok) {
      const data = await response.json();
      logger.info("✅ Стиль успешно загружен из базы знаний.");
      return data.style_context || "";
    } else {
      logger.warn("⚠️ Бэкенд стиля ответил ошибкой", { status: response.status });
      return "";
    }
  } catch (e) {
    logger.warn("⚠️ Не удалось получить стиль (сервер выключен?)", e);
    return "";
  }
}

export async function fetchScreenwritingPrinciples(context: string, k = 5): Promise<string> {
  try {
    logger.info(`📡 Запрашиваем структурные принципы Mowery для контекста: "${context}" (k=${k})...`);
    const response = await fetch(`${BACKEND_URL}/api/get-screenwriting-principles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: context, k })
    });

    if (response.ok) {
      const data = await response.json();
      logger.info("✅ Структурные принципы успешно загружены.");
      return data.principles_context || "";
    } else {
      logger.warn("⚠️ Бэкенд принципов ответил ошибкой", { status: response.status });
      return "";
    }
  } catch (e) {
    logger.warn("⚠️ Не удалось получить принципы (сервер выключен?)", e);
    return "";
  }
}

// --- RETRY HELPER ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Extracts HTTP status code from Gemini SDK error messages.
// Pattern: "got status: UNAVAILABLE. {"error":{"code":503..."
function getHttpStatus(err: unknown): number | null {
  if (!(err instanceof Error)) return null;
  const m = err.message.match(/"code"\s*:\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

export async function withRetry<T>(fn: () => Promise<T>, label: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= API_RETRY_COUNT; attempt++) {
    if (signal?.aborted) throw new Error('Operation cancelled by user.');
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted) throw new Error('Operation cancelled by user.', { cause: err });
      lastError = err;
      const status = getHttpStatus(err);
      // 400 Bad Request: no point retrying — the request itself is malformed.
      if (status === 400) throw err;
      if (attempt < API_RETRY_COUNT) {
        // 429 Rate Limit: longer backoff + jitter to avoid thundering herd.
        const base = status === 429
          ? API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt + 1) + Math.floor(Math.random() * 1000)
          : API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`${label}: attempt ${attempt + 1} failed (HTTP ${status ?? 'unknown'}), retrying in ${base}ms`, err);
        await delay(base);
      }
    }
  }
  throw lastError;
}

// --- RESPONSE TEXT EXTRACTOR ---
// response.text may be empty when googleSearch grounding is active on some models.
// Falls back to manually assembling text from candidates[0].content.parts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractResponseText(response: any, label: string): string {
  const direct = response.text as string | undefined;
  if (direct) return direct;

  // Manual fallback: collect all text parts from first candidate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = response.candidates?.[0]?.content?.parts as any[] | undefined;
  if (parts?.length) {
    const assembled = parts.filter(p => typeof p.text === 'string').map(p => p.text as string).join('');
    if (assembled) return assembled;
  }

  // Check if prompt was blocked by safety filters (no candidates at all)
  const blockReason = response.promptFeedback?.blockReason;
  const finishReason = response.candidates?.[0]?.finishReason;
  logger.error(`${label}: empty text. blockReason=${blockReason} finishReason=${finishReason}`, {
    candidateCount: response.candidates?.length ?? 0,
    parts: parts?.map((p: Record<string, unknown>) => Object.keys(p)),
  });
  return '';
}

// --- SAFE JSON PARSER ---

export function safeJsonParse<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    logger.error(`${label}: Failed to parse JSON response`, { text: text.substring(0, 200), err });
    throw new Error(`${label}: Invalid JSON response from API`, { cause: err });
  }
}

// Extracts the first JSON object or array from free-form text.
// Required when googleSearch grounding is active — incompatible with responseMimeType/responseSchema.
export function extractJson<T>(text: string, label: string): T {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/([{[][\s\S]*[}\]])/);
  if (!match) {
    logger.error(`${label}: No JSON block found in grounded response`, { text: text.substring(0, 300) });
    throw new Error(`${label}: No JSON found in response`);
  }
  return safeJsonParse<T>(match[1].trim(), label);
}

// --- TIMING CALCULATION MODULE ---

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const numberToWords = (n: number): string => {
  if (n === 0) return 'zero';
  let str = '';

  if (n >= 1000000) {
      str += numberToWords(Math.floor(n / 1000000)) + ' million ';
      n %= 1000000;
  }
  if (n >= 1000) {
      str += numberToWords(Math.floor(n / 1000)) + ' thousand ';
      n %= 1000;
  }
  if (n >= 100) {
      str += ONES[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
  }
  if (n >= 20) {
      str += TENS[Math.floor(n / 10)] + ' ';
      n %= 10;
  }
  if (n >= 10) {
      str += TEENS[n - 10] + ' ';
      n = 0;
  }
  if (n > 0) {
      str += ONES[n] + ' ';
  }
  return str.trim();
};

const expandTextForTiming = (text: string): string => {
  if (!text) return '';
  let s = text.toLowerCase().trim();

  s = s.replace(/\$([0-9,]+(?:\.[0-9]+)?)/g, (_match, p1) => {
     return p1 + ' us dollars';
  });

  s = s.replace(/([0-9,]+(?:\.[0-9]+)?)%/g, '$1 percent');

  s = s.replace(/\b(19|20)(\d{2})\b/g, (_match, p1, p2) => {
      return numberToWords(parseInt(p1)) + ' ' + numberToWords(parseInt(p2));
  });

  s = s.replace(/(\d+)\.(\d+)/g, (_match, p1, p2) => {
      return numberToWords(parseInt(p1.replace(/,/g, ''))) + ' point ' + numberToWords(parseInt(p2));
  });

  s = s.replace(/\d+/g, (match) => {
      return numberToWords(parseInt(match.replace(/,/g, '')));
  });

  s = s.replace(/[^a-z0-9\s]/g, '');

  return s.replace(/\s+/g, ' ').trim();
};

export const calculateDurationAndRetiming = (script: ScriptBlock[]): ScriptBlock[] => {
  let runningTimeSeconds = 0;

  return script.map(block => {
    const spokenText = expandTextForTiming(block.audioScript);
    const charCount = spokenText.length;

    let duration = Math.ceil(charCount / CHARS_PER_SECOND);
    if (duration < MIN_BLOCK_DURATION_SEC) duration = MIN_BLOCK_DURATION_SEC;

    const startTotal = runningTimeSeconds;
    const endTotal = runningTimeSeconds + duration;

    runningTimeSeconds = endTotal;

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const sec = (totalSec % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    return {
      ...block,
      timecode: `${formatTime(startTotal)} - ${formatTime(endTotal)}`
    };
  });
};

// --- INTERNAL STRUCTURED TYPES FOR RADAR + ARCHITECT ---
// These are not exported — RADAR/ARCHITECT still return `string` to the pipeline.
// Using responseSchema forces the model to output valid JSON; we then format to readable text.

export interface RadarDirective  { query: string; rationale: string; }
export interface RadarAnalysis   { strategicOverview: string; searchDirectives: RadarDirective[]; }
export interface ArchitectBlock  { block: string; timecode: string; description: string; }
export interface ArchitectPlan   { title: string; thumbnailConcept: string; visualAnchor: string; structure: ArchitectBlock[]; }

export function formatRadarOutput(r: RadarAnalysis): string {
  let out = `STRATEGIC OVERVIEW:
${r.strategicOverview}

/// SEARCH DIRECTIVES`;
  r.searchDirectives.forEach((d, i) => {
    out += `

[${i + 1}] QUERY: "${d.query}"
    RATIONALE: ${d.rationale}`;
  });
  return out;
}

export function formatArchitectOutput(p: ArchitectPlan): string {
  let out = `=== PACKAGING PLAN ===\nTITLE: ${p.title}\nTHUMBNAIL: ${p.thumbnailConcept}\n\n`;
  out += `=== VISUAL ANCHOR (Opening 5 seconds) ===\n${p.visualAnchor}\n\n`;
  out += `=== STRUCTURAL BREAKDOWN ===`;
  p.structure.forEach((s, i) => {
    out += `\n\n${i + 1}. ${s.block} (${s.timecode})\n   ${s.description}`;
  });
  return out;
}

// --- AGENT FUNCTIONS ---
// Models are hardcoded per agent via AGENT_MODELS (constants.ts)

export const getToolsForModel = (model: string) => {
  // googleSearch grounding only works reliably on Flash models.
  // Pro models (gemini-3.1-pro-preview) disconnect immediately when googleSearch is included.
  if (model.includes('flash')) {
    return [{ googleSearch: {} }];
  }
  return undefined;
};
