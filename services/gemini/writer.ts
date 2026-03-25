import { Type, ScriptBlock, ProjectType } from './client';
import { getClient, withRetry, safeJsonParse, calculateDurationAndRetiming, fetchHarrisStyle, fetchScreenwritingPrinciples } from './client';
import { getModel } from './client';
import { AGENT_SCRIPTWRITER_PROMPT, AGENT_SHORT_DOC_WRITER_PROMPT, AGENT_OUTLINE_PROMPT, AGENT_SHORT_DOC_OUTLINE_PROMPT } from './client';

// --- OUTLINER: Generates numbered scene outline with setup/payoff arcs ---
export const runOutlineAgent = async (
  structure: string,
  dossier: string,
  signal?: AbortSignal,
  docCircle?: string,
  actPlanning?: string,
  _projectType: ProjectType = 'short_doc',
): Promise<string> => {
  const model = getModel('OUTLINER');
  const principles = await fetchScreenwritingPrinciples('scene entry exit choice identification structure', 5);
  const principlesText = principles || '(no principles available — backend offline)';
  return withRetry(async () => {
    const ai = getClient();
    let prompt: string;
    if (docCircle || actPlanning) {
      const docOutlinePrompt = AGENT_SHORT_DOC_OUTLINE_PROMPT;
      prompt = docOutlinePrompt
        .replace('__SCREENWRITING_PRINCIPLES__', principlesText)
        .replace('__ACT_PLANNING__', actPlanning ?? '')
        .replace('__DOC_CIRCLE__', docCircle ?? '')
        .replace('__STRUCTURE__', structure)
        .replace('__DOSSIER__', dossier);
    } else {
      prompt = AGENT_OUTLINE_PROMPT
        .replace('__STRUCTURE__', structure)
        .replace('__DOSSIER__', dossier)
        .replace('__DOC_CONTEXT__', '');
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: 16384, abortSignal: signal },
    });

    const text = response.text;
    if (!text) throw new Error("Outliner returned empty response.");
    return text.trim();
  }, 'runOutlineAgent', signal);
};

// Writer uses streaming to prevent ERR_CONNECTION_CLOSED on large responses.
// Pro model + 60 blocks + bilingual text can take 2-3 min.
// onProgress fires every 20 chunks so the UI can show activity.
export const runWriterAgent = async (
  structure: string,
  dossier: string,
  signal?: AbortSignal,
  onProgress?: (chunks: number) => void,
  outline?: string,
): Promise<ScriptBlock[]> => {
  const model = getModel('WRITER');
  return withRetry(async () => {
    const ai = getClient();
    const dossierStr = dossier;

    // Extract topic for style fetch (dossier always starts with "TOPIC: ...")
    let topicForStyle = "General geopolitical conflict";
    const topicMatch = dossier.match(/^TOPIC:\s*(.+)/m);
    if (topicMatch) topicForStyle = topicMatch[1].trim();

    const [styleContext, principles] = await Promise.all([
      fetchHarrisStyle(topicForStyle),
      fetchScreenwritingPrinciples('physicalize belief sacrifice scene writing choice', 5),
    ]);

    // Inject style + structure principles into prompt
    const enhancedPrompt = `
      ${AGENT_SCRIPTWRITER_PROMPT}

      === STYLE REFERENCE: HARRIS/KOZYRA DATA-NOIR ===
      Use the following real examples from Johnny Harris transcripts to copy the rhythm, visual language, and pacing.
      Your script must feel like a cold intelligence briefing, not a YouTube video.

      ${styleContext ? `STYLE EXAMPLES FOR THIS TOPIC:\n${styleContext}` : "No style examples found. Default to cold, analytical Data-Noir tone."}
      ================================================

      === STRUCTURAL PRINCIPLES (MOWERY METHOD) ===
      Apply these narrative architecture principles to strengthen the script's dramatic impact:

      ${principles || '(no principles available — backend offline)'}

      BLOCK ENTRY/EXIT: first sentence in medias res, last sentence on a turn.
      PHYSICALIZE BELIEF: show conviction through specific action, not description.
      CHOICE SURFACING: make protagonist decisions visible to the viewer.
      ================================================
    `;

    // thinkingConfig removed: gemini-3.x uses thinkingLevel (not thinkingBudget),
    // and mixing it with responseSchema + streaming causes immediate server disconnect.

    const outlineSection = outline
      ? `\n\nAPPROVED SCENE OUTLINE (follow this structure closely):\n${outline}`
      : '';

    const response = await ai.models.generateContentStream({
      model,
      contents: `DOSSIER: ${dossierStr}\nSTRUCTURE: ${structure}${outlineSection}\n\n${enhancedPrompt}`,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 65536,
        abortSignal: signal,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timecode: { type: Type.STRING },
              visualCue: { type: Type.STRING },
              overlayFX: { type: Type.STRING },
              audioScript: { type: Type.STRING },
              russianScript: { type: Type.STRING },
              blockType: { type: Type.STRING, enum: ['HOOK', 'INTRO', 'BODY', 'TRANSITION', 'SALES', 'OUTRO'] }
            },
            required: ["timecode", "visualCue", "overlayFX", "audioScript", "russianScript", "blockType"]
          }
        }
      }
    });

    // Collect all streamed chunks into the full JSON string
    let fullText = '';
    let chunkCount = 0;
    for await (const chunk of response) {
      if (signal?.aborted) throw new Error('Operation cancelled by user.');
      const part = chunk.text;
      if (part) {
        fullText += part;
        chunkCount++;
        if (onProgress && chunkCount % 20 === 0) onProgress(chunkCount);
      }
    }

    if (!fullText) throw new Error("Writer returned empty script.");

    const rawScript = safeJsonParse<ScriptBlock[]>(fullText, 'Writer');
    return calculateDurationAndRetiming(rawScript);
  }, 'runWriterAgent');
};

// --- DOCUMENTARY: PER-ACT WRITER (streaming, ~45-55 blocks per call, ~15 min per act) ---
export const runDocumentaryActWriter = async (
  act: { block: string; timecode: string; description: string },
  allActs: { block: string; timecode: string; description: string }[],
  dossier: string,
  prevBlocks: ScriptBlock[],
  signal?: AbortSignal,
  fullOutline?: string,
  _projectType: ProjectType = 'short_doc',
  motifContext?: string,
): Promise<ScriptBlock[] | null> => {
  const model = getModel('WRITER');

  // Fetch style + structure principles before the retry loop (avoid redundant RAG calls on retry)
  const topicQuery = `${act.block} ${act.description}`.substring(0, 200);
  const [styleContext, principles] = await Promise.all([
    fetchHarrisStyle(topicQuery, 6),
    fetchScreenwritingPrinciples('physicalize belief sacrifice scene writing choice', 5),
  ]);

  const writerPrompt = AGENT_SHORT_DOC_WRITER_PROMPT
    .replace('__SCREENWRITING_PRINCIPLES__', principles || '(no principles available — backend offline)');

  const actIndex = allActs.indexOf(act) + 1;

  const structureSummary = allActs.map((a, i) =>
    `ACT ${i + 1}: ${a.block} [${a.timecode}]`
  ).join('\n');

  const prevContext = prevBlocks.length > 0
    ? `\n\nLAST BLOCKS FROM PREVIOUS ACT (maintain narrative continuity):\n${prevBlocks.map(b => `"${b.audioScript}"`).join('\n')}`
    : '';

  const outlineContext = fullOutline
    ? `\n\nFULL 32-BEAT OUTLINE (for narrative coherence — ensure this act's blocks align with the beats assigned to it):\n${fullOutline}`
    : '';

  const motifBlock = motifContext
    ? `\n\nMOTIF CONTINUITY LOG (themes, images, and phrases established in previous acts — reinforce recurring motifs, set up payoffs, or resolve open threads):\n${motifContext}`
    : '';

  const contents = `FULL DOCUMENTARY STRUCTURE:\n${structureSummary}\n\nCURRENT ACT TO WRITE: ACT ${actIndex} OF ${allActs.length}\nTITLE: "${act.block}"\nTIMECODE: ${act.timecode}\n${act.description}${prevContext}${outlineContext}${motifBlock}\n\nRESEARCH DOSSIER:\n${dossier}\n\n${writerPrompt}\n\n${styleContext ? `=== STYLE REFERENCE: HARRIS/KOZYRA DATA-NOIR ===\n${styleContext}\n================================================` : ''}`;

  return withRetry(async () => {
    const ai = getClient();
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        abortSignal: signal,
        responseMimeType: "application/json",
        maxOutputTokens: 65536,
      }
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) return null;
      fullText += chunk.text ?? '';
    }

    if (!fullText) throw new Error(`DocWriter ${act.block}: empty response`);
    return safeJsonParse<ScriptBlock[]>(fullText, `DocWriter ${act.block}`);
  }, `runDocumentaryActWriter:${act.block}`, signal);
};
