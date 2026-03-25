import { Type, ProjectType } from './client';
import { getClient, withRetry, safeJsonParse, formatArchitectOutput, ArchitectPlan, ArchitectBlock, fetchScreenwritingPrinciples } from './client';
import { getModel } from './client';
import { AGENT_ARCHITECT_PROMPT, AGENT_ARCHITECT_SHORT_DOC_PROMPT, AGENT_SHORT_DOC_CIRCLE_PROMPT, AGENT_SHORT_DOC_ACT_PLANNING_PROMPT } from './client';

export const runArchitectAgent = async (dossier: string, projectType: ProjectType = 'short_doc', signal?: AbortSignal): Promise<{ structure: string; thumbnailConcept: string; acts?: ArchitectBlock[] }> => {
  const model = getModel('ARCHITECT');
  const prompt = projectType === 'short_doc' ? AGENT_ARCHITECT_SHORT_DOC_PROMPT : AGENT_ARCHITECT_PROMPT;
  return withRetry(async () => {
    const ai = getClient();

    const response = await ai.models.generateContent({
      model,
      contents: `DOSSIER: ${dossier}\n\n${prompt}`,
      config: {
        abortSignal: signal,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title:            { type: Type.STRING },
            thumbnailConcept: { type: Type.STRING },
            visualAnchor:     { type: Type.STRING },
            structure: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  block:       { type: Type.STRING },
                  timecode:    { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["block", "timecode", "description"],
              },
            },
          },
          required: ["title", "thumbnailConcept", "visualAnchor", "structure"],
        },
      },
    });
    const text = response.text;
    if (!text) throw new Error("Architect failed to build structure.");
    const parsed = safeJsonParse<ArchitectPlan>(text, 'Architect');
    const result: { structure: string; thumbnailConcept: string; acts?: ArchitectBlock[] } = {
      structure: formatArchitectOutput(parsed),
      thumbnailConcept: parsed.thumbnailConcept,
    };
    // Documentary acts now come from DOC_CIRCLE agent, not Architect
    return result;
  }, 'runArchitectAgent', signal);
};

export type DocCircleResult = { text: string; acts: ArchitectBlock[] };

// Parse the act structure from DocCircle output.
// Primary: reads the ACTS_JSON block appended by the prompt.
// Fallback: regex heuristic for older outputs, then placeholder.
function parseDocCircleActs(text: string, _projectType: ProjectType = 'short_doc'): ArchitectBlock[] {
  // Primary: find ACTS_JSON: [...] block
  const jsonMarker = text.indexOf('ACTS_JSON:');
  if (jsonMarker !== -1) {
    const jsonStr = text.slice(jsonMarker + 'ACTS_JSON:'.length).trim();
    try {
      const parsed = JSON.parse(jsonStr.match(/(\[[\s\S]*?\])/)?.[1] ?? '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((a: { block?: string; timecode?: string; description?: string }) => ({
          block: a.block ?? '',
          timecode: a.timecode ?? '',
          description: a.description ?? '',
        }));
      }
    } catch { /* fall through to regex */ }
  }

  // Fallback: regex for legacy plain-text format
  const acts: ArchitectBlock[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const actMatch = line.match(/^ACT\s+(\d+)\s*[—–-]\s*(.+)/);
    if (!actMatch) continue;
    const actNum = actMatch[1];
    const tcLine = (lines[i + 1] ?? '').trim();
    const tcMatch = tcLine.match(/Timecode:\s*([\d:–\-–]+(?:–[\d:]+)?)/);
    const titleMatch = tcLine.match(/Title:\s*(.+)/);
    const summaryLine = (lines[i + 2] ?? '').trim();
    const summaryMatch = summaryLine.match(/Summary:\s*(.+)/);
    acts.push({
      block: `ACT ${actNum}: ${titleMatch?.[1]?.trim() ?? actMatch[2].trim()}`,
      timecode: tcMatch?.[1]?.trim() ?? `Act ${actNum}`,
      description: summaryMatch?.[1]?.trim() ?? actMatch[2].trim(),
    });
  }
  if (acts.length > 0) return acts;

  // Last resort: placeholder acts
  const fallbackCount = 2;
  return Array.from({ length: fallbackCount }, (_, n) => ({
    block: `ACT ${n + 1}`,
    timecode: '',
    description: '',
  }));
}

// --- DOC CIRCLE: Steps 1-4 (drama mandate + conflict arch + global Harmon circle + 4-act division) ---
export const runDocCircleAgent = async (
  structure: string,
  dossier: string,
  signal?: AbortSignal,
  projectType: ProjectType = 'short_doc',
): Promise<DocCircleResult> => {
  const model = getModel('DOC_CIRCLE');
  const principles = await fetchScreenwritingPrinciples('thematic structure conflict layers protagonist belief', 5);
  return withRetry(async () => {
    const ai = getClient();
    const prompt = AGENT_SHORT_DOC_CIRCLE_PROMPT
      .replace('__SCREENWRITING_PRINCIPLES__', principles || '(no principles available — backend offline)')
      .replace('__STRUCTURE__', structure)
      .replace('__DOSSIER__', dossier);

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: 12288, abortSignal: signal },
    });

    const text = response.text;
    if (!text) throw new Error("DocCircle returned empty response.");
    const trimmed = text.trim();
    return { text: trimmed, acts: parseDocCircleActs(trimmed, projectType) };
  }, 'runDocCircleAgent', signal);
};

// --- ACT PLANNING: Steps 4-5 (per-act circles + 32-beat outline) ---
// Uses streaming to prevent 503 disconnects on large Pro model responses.
export const runActPlanningAgent = async (
  docCircle: string,
  structure: string,
  dossier: string,
  signal?: AbortSignal,
  _projectType: ProjectType = 'short_doc',
): Promise<string> => {
  const model = getModel('ACT_PLANNING');
  const principles = await fetchScreenwritingPrinciples('act reversal sacrifice belief stake three layers', 5);
  return withRetry(async () => {
    const ai = getClient();
    const actPlanningPrompt = AGENT_SHORT_DOC_ACT_PLANNING_PROMPT;
    const prompt = actPlanningPrompt
      .replace('__SCREENWRITING_PRINCIPLES__', principles || '(no principles available — backend offline)')
      .replace('__DOC_CIRCLE__', docCircle)
      .replace('__STRUCTURE__', structure)
      .replace('__DOSSIER__', dossier);

    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: { abortSignal: signal },
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) throw new Error('Operation cancelled by user.');
      fullText += chunk.text ?? '';
    }

    if (!fullText) throw new Error("ActPlanning returned empty response.");
    return fullText.trim();
  }, 'runActPlanningAgent', signal);
};
