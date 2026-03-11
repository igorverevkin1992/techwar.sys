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
export const IMAGE_GEN_PROMPT_PREFIX = 'Cinematic storyboard frame, high contrast, investigative tech documentary style, dark UI aesthetic, data visualization mood. SCENE:';

// --- LOG CONFIG ---
export const MAX_LOG_ENTRIES = 500;

// --- API CONFIG ---
export const API_RETRY_COUNT = 5;           // 503 UNAVAILABLE needs longer recovery window
export const API_RETRY_BASE_DELAY_MS = 2000; // backoff: 2s, 4s, 8s, 16s, 32s = ~62s total
export const STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min without a chunk → abort (total can be 30+ min for large acts)
export const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB max for file imports

export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fast/High Quota)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (High Quality)' }
];

// --- TOPIC TEMPLATES ---
// Pre-defined narrative frameworks. User selects one → topic field is pre-filled with a scaffold.
export interface TopicTemplate {
  id: string;
  name: string;
  category: 'algorithm' | 'ai_ethics' | 'platform_power' | 'corporate_state';
  scaffold: string; // Fill-in-the-blank topic string shown in the topic input
  description: string;
}

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  // Algorithms as Editors of Reality
  { id: 'algo-rabbit',        category: 'algorithm',       name: 'Algorithm Rabbit Hole',    scaffold: 'The [TOPIC] Rabbit Hole: How [PLATFORM]\'s Algorithm Leads Users to [EXTREME CONTENT]',                 description: 'Recommendation system as a radicalization engine' },
  { id: 'filter-bubble',      category: 'algorithm',       name: 'Filter Bubble',            scaffold: 'Why [PLATFORM] Shows Two People Opposite Realities About [EVENT]',                                       description: 'Algorithmic isolation creating parallel information universes' },
  { id: 'radicalization',     category: 'algorithm',       name: 'Radicalization Engine',    scaffold: 'Inside [PLATFORM]\'s Radicalization Engine: The [METRIC] That Drives Extremism',                         description: 'Engagement optimization systematically amplifying extreme content' },
  // AI Politics and Ethics
  { id: 'llm-censorship',     category: 'ai_ethics',       name: 'AI Censorship',            scaffold: 'What [AI MODEL] Refuses to Say About [TOPIC] — and Who Decided That',                                   description: 'Hidden editorial decisions embedded in AI systems' },
  { id: 'training-data',      category: 'ai_ethics',       name: 'Hidden Training Data',     scaffold: 'Who Built [AI]\'s Values: The Hidden Training Data Behind [COMPANY]\'s Model',                           description: 'Opaque data curation shaping AI worldview at scale' },
  { id: 'deepfake-history',   category: 'ai_ethics',       name: 'Deepfake History',         scaffold: 'The [EVENT] Deepfake: How Synthetic Media Rewrote a Real Story in Real Time',                           description: 'AI-generated content weaponized to manipulate collective memory' },
  // Platform Power
  { id: 'platform-coup',      category: 'platform_power',  name: 'Platform Coup',            scaffold: 'How [PLATFORM] Decided the Outcome of [EVENT] Without a Single Vote',                                   description: 'Private platform rules reshaping democratic outcomes' },
  { id: 'shadow-ban',         category: 'platform_power',  name: 'Shadow Ban',               scaffold: 'The [PLATFORM] Shadow Ban: Who Gets Silenced, Who Decides, and Why It\'s Legal',                        description: 'Invisible content suppression and its political consequences' },
  { id: 'content-moderation', category: 'platform_power',  name: 'Moderation Machine',       scaffold: 'Inside [COMPANY]\'s Content Moderation Engine: The Rules No Government Approved',                       description: 'Unaccountable private governance of global public discourse' },
  // Corporate State
  { id: 'tech-vs-state',      category: 'corporate_state', name: 'Tech vs. State',           scaffold: 'When [TECH COMPANY] Became More Powerful Than [GOVERNMENT]: The [INCIDENT] Case',                       description: 'IT corporations displacing government authority' },
  { id: 'data-colonialism',   category: 'corporate_state', name: 'Data Colonialism',         scaffold: 'The [COMPANY] Data Deal: How [REGION]\'s Behavioral Data Was Extracted and Monetized',                  description: 'Asymmetric data extraction under the guise of free services' },
  { id: 'surveillance-infra', category: 'corporate_state', name: 'Surveillance Infrastructure', scaffold: 'Inside [COMPANY/GOVERNMENT]\'s Surveillance Infrastructure: What [TECHNOLOGY] Knows About You',    description: 'The architecture of mass behavioral monitoring' },
];

// --- DEMONETIZATION BLACKLIST ---
// Full vocabulary from YOUTUBE ADVERTISER BLACKLIST in Writer prompts (7 categories).
// Single source of truth — used by Audit Panel and AUDIT_FIX agent.
export const DEMONETIZATION_BLACKLIST: string[] = [
  // CAT-1: Violence & Conflict
  'assassination', 'assassinate', 'liquidation', 'killing', 'murder', 'murdered',
  'slaughter', 'massacre', 'genocide', 'torture', 'execution', 'beheading', 'eliminate',
  'violence', 'brutality', 'atrocity', 'carnage', 'slaying', 'stabbing', 'warlord',
  'hostage', 'war crime', 'ethnic cleansing',
  // CAT-2: Weapons & Firearms
  'explosive', 'explosives', 'grenade', 'sniper', 'landmine', 'nuke',
  'shooter', 'decapitation', 'fatality', 'fatalities',
  // CAT-3: Drugs
  'cocaine', 'heroin', 'fentanyl', 'opioid', 'overdose', 'narcotics', 'junkie',
  'drug cartel', 'drug trafficking', 'drug dealer',
  // CAT-4: Mental Health (highest risk)
  'suicide', 'suicidal', 'self-harm', 'anorexia', 'bulimia', 'mental breakdown',
  // CAT-5: Extremism
  'terrorist', 'terrorism', 'jihad', 'extremist', 'radicalization', 'hate crime',
  'white supremacist',
  // CAT-6: Sexual content
  'rape', 'sexual assault', 'molestation', 'pedophile', 'grooming',
  // CAT-7: General controversy
  'dead bodies', 'death toll',
];

// --- PROJECT FORMAT CONFIG ---
export interface ProjectConfig {
  label: string;
  description: string;
  minChars: number;   // minimum total audioScript chars for duration validation
  minBlocks: number;
  ragK: number;       // ChromaDB k (style examples to fetch per Writer call)
}

export const PROJECT_CONFIGS: Record<'youtube' | 'documentary' | 'short_doc', ProjectConfig> = {
  youtube: {
    label: 'YouTube Video',
    description: 'Up to 20 min',
    minChars: 10_800,  // 12 min × 60 sec × 15 chars/sec
    minBlocks: 60,
    ragK: 3,
  },
  short_doc: {
    label: 'Short Documentary (YouTube)',
    description: '15–20 min',
    minChars: 13_500,  // 15 min × 60 sec × 15 chars/sec
    minBlocks: 30,
    ragK: 4,
  },
  documentary: {
    label: 'Documentary Film',
    description: '60–90 min',
    minChars: 54_000,  // 60 min × 60 sec × 15 chars/sec
    minBlocks: 200,
    ragK: 6,           // 6 style passages per act call
  },
};

// --- AGENT PROMPTS (extracted to ./prompts/) ---
export {
  AGENT_SCOUT_PROMPT,
  AGENT_LENS_PROMPT,
  AGENT_RESEARCH_PROMPT,
  AGENT_ARCHITECT_PROMPT,
  AGENT_ARCHITECT_DOCUMENTARY_PROMPT,
  AGENT_ARCHITECT_SHORT_DOC_PROMPT,
  AGENT_SCRIPTWRITER_PROMPT,
  AGENT_DOCUMENTARY_WRITER_PROMPT,
  AGENT_SHORT_DOC_WRITER_PROMPT,
  AGENT_SEO_PROMPT,
  AGENT_SCRIPT_REWRITER_PROMPT,
  AGENT_AUDIT_FIX_PROMPT,
  AGENT_OUTLINE_PROMPT,
  AGENT_DOC_OUTLINE_PROMPT,
  AGENT_SHORT_DOC_OUTLINE_PROMPT,
  AGENT_DOC_CIRCLE_PROMPT,
  AGENT_SHORT_DOC_CIRCLE_PROMPT,
  AGENT_ACT_PLANNING_PROMPT,
  AGENT_SHORT_DOC_ACT_PLANNING_PROMPT,
} from './prompts';
