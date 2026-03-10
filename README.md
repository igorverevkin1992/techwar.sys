# TECHWAR.SYS V3.4

Autonomous AI video production system powered by a **Chain of Agents** architecture. Generates retention-optimized video scripts through a sequential pipeline of specialized AI agents backed by Google Gemini.

**Channel:** TECH.WAR — an English-language analytical channel about how algorithms, AI, and IT corporations construct geopolitical meanings and manage public attention.

**Three Pillars:**
1. **Algorithms as Editors of Reality** — How recommendation systems (YouTube, TikTok, X) create parallel realities and amplify radicalization
2. **AI Politics and Ethics** — Training data opacity, AI censorship, deepfakes as tools for rewriting events in real time
3. **Corporations as Political Actors** — Platform rules that shape elections, shadow bans, data colonialism, and the accountability vacuum

## Architecture

The system runs agents sequentially, each building on the previous output:

```
Scout ──> Radar ──> Analyst ──> Architect ──> Writer
  │         │          │           │            │
  │         │          │           │            └─ Final English script (60+ blocks)
  │         │          │           └─ Video structure & retention map
  │         │          └─ Fact-checked research dossier (Google Search)
  │         └─ Search directive generation
  └─ Tech/AI/platform topic scanning (Google Search)
```

| Agent | Role | Output |
|-------|------|--------|
| **Scout** | Scans current tech/AI/platform news via Google Search | 4 topic suggestions with hooks |
| **Radar** | Generates targeted search directives for primary evidence | 3 search directives |
| **Analyst** | Finds system-level evidence via Google Search | Structured research dossier (JSON) |
| **Architect** | Designs retention structure (System Anatomy formula) | Timecoded 6-block blueprint |
| **Writer** | Generates full production script | 60+ blocks, English audio |

### Steppable Mode

When enabled, the pipeline pauses between agents to allow manual review and editing of each agent's output before proceeding.

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Tailwind CSS 4
- **Build:** Vite 6
- **AI:** Google Gemini API (`@google/genai`) — models from 1.5 Flash to 3.0 Pro
- **Database:** Supabase (PostgreSQL) — operation history persistence
- **Testing:** Vitest, Testing Library
- **Linting:** ESLint with typescript-eslint
- **CI/CD:** GitHub Actions

## Getting Started

### Prerequisites

- Node.js >= 20
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))
- Supabase project (optional, for history persistence)

### Installation

```bash
git clone <repo-url>
cd techwar.sys
npm install --legacy-peer-deps
```

### Configuration

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

```env
VITE_GOOGLE_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
```

> **Note:** Supabase is optional. Without it, the app works fully but doesn't persist history between sessions.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
techwar.sys/
├── components/
│   ├── AgentLog.tsx          # Terminal-style log display
│   ├── ErrorBoundary.tsx     # React error boundary with recovery UI
│   ├── HistorySidebar.tsx    # Sliding sidebar for operation history
│   ├── RichTextDisplay.tsx   # Markdown-like text renderer
│   └── ScriptDisplay.tsx     # Script table view + export (DOC/CSV)
├── services/
│   ├── geminiService.ts      # Gemini API agent functions + retry logic
│   ├── logger.ts             # Centralized logging utility
│   └── supabaseClient.ts     # Supabase CRUD operations
├── tests/
│   ├── setup.ts              # Vitest setup (jest-dom)
│   ├── constants.test.ts     # Config constants tests
│   ├── logger.test.ts        # Logger utility tests
│   └── types.test.ts         # Type definitions & initial state tests
├── .github/workflows/
│   └── ci.yml                # GitHub Actions CI pipeline
├── App.tsx                   # Main app component (useReducer state)
├── constants.ts              # App config, prompts, model list
├── types.ts                  # TypeScript interfaces & enums
├── index.tsx                 # React entry point
├── index.html                # HTML entry point
├── index.css                 # Tailwind CSS v4 config + custom theme
├── vite.config.ts            # Vite config
├── vitest.config.ts          # Vitest config
├── eslint.config.js          # ESLint flat config
└── tsconfig.json             # TypeScript config
```

## Export Formats

The generated script can be exported in three formats:

| Format | Contents | Use Case |
|--------|----------|----------|
| **Dossier (.doc)** | Radar + Analyst + Architect output | Research review |
| **Script (.doc)** | Full timecoded script with storyboard images | Production handoff |
| **Editor Task (.csv)** | Timecodes, visual cues, audio columns | Video editor worksheet |

## Supported Models

| Model | Features | Best For |
|-------|----------|----------|
| Gemini 3.0 Pro | Google Search, thinking | Highest quality output |
| Gemini 3.0 Flash | Google Search, thinking | Fast iteration |

> Google Search tool is only available on Gemini 3.x models. Other models use prompt-only generation.

## CI/CD

GitHub Actions runs on every push and PR:

1. **Type check** — `tsc --noEmit`
2. **Lint** — ESLint with `no-explicit-any` enforced
3. **Test** — Vitest
4. **Build** — Vite production build

## License

Private project. All rights reserved.
