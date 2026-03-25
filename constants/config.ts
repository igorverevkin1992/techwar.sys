// --- APP CONFIG ---
export const APP_VERSION = '3.4';

// --- PER-AGENT MODEL MAPPING ---
// Flash — fast tasks (search, structure). Pro — quality-critical tasks (facts, writing).
export const AGENT_MODELS = {
  SCOUT:        'gemini-3-flash-preview',
  RADAR:        'gemini-3-flash-preview',
  ANALYST:      'gemini-3-pro-preview',
  ARCHITECT:    'gemini-3-flash-preview',
  OUTLINER:     'gemini-3-flash-preview',
  DOC_CIRCLE:   'gemini-3-flash-preview',
  ACT_PLANNING: 'gemini-3-pro-preview',
  WRITER:       'gemini-3-pro-preview',
} as const;

// --- TIMING CONFIG ---
export const CHARS_PER_SECOND = 15; // ~150 wpm pace, matches duration formula: chars/15 = seconds
export const MIN_BLOCK_DURATION_SEC = 2;

// --- IMAGE GENERATION CONFIG ---
export const IMAGE_GEN_MODEL = 'gemini-2.5-flash-image';
export const IMAGE_GEN_PROMPT_PREFIX = 'Cinematic storyboard frame, high contrast, geopolitical thriller style. SCENE:';

// --- LOG CONFIG ---
export const MAX_LOG_ENTRIES = 500;

// --- API CONFIG ---
export const API_RETRY_COUNT = 5;           // 503 UNAVAILABLE needs longer recovery window
export const API_RETRY_BASE_DELAY_MS = 2000; // backoff: 2s, 4s, 8s, 16s, 32s = ~62s total

// --- PROJECT FORMAT CONFIG ---
export interface ProjectConfig {
  label: string;
  description: string;
  minChars: number;   // minimum total audioScript chars for duration validation
  minBlocks: number;
  ragK: number;       // ChromaDB k (style examples to fetch per Writer call)
}

export const PROJECT_CONFIGS: Record<'short_doc', ProjectConfig> = {
  short_doc: {
    label: 'Short Documentary (YouTube)',
    description: '15–20 min',
    minChars: 13_500,  // 15 min × 60 sec × 15 chars/sec
    minBlocks: 30,
    ragK: 4,
  },
};
