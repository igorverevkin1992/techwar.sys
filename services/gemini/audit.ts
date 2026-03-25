import { ScriptBlock, logger } from './client';
import { getClient, withRetry, safeJsonParse } from './client';
import { getModel } from './client';
import { AGENT_SCRIPT_REWRITER_PROMPT, AGENT_AUDIT_FIX_PROMPT } from './client';

const REWRITER_CHUNK_SIZE = 25;

export const runScriptRewriterAgent = async (
  script: ScriptBlock[],
  onChunkDone: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<ScriptBlock[]> => {
  const ai = getClient();
  const model = getModel('SCOUT'); // Flash: editing task, not generation
  const result: ScriptBlock[] = [];

  const totalChunks = Math.ceil(script.length / REWRITER_CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new Error('Operation cancelled by user.');

    const chunkStart = i * REWRITER_CHUNK_SIZE;
    const contextBlocks = script.slice(Math.max(0, chunkStart - 3), chunkStart);
    const chunkBlocks = script.slice(chunkStart, chunkStart + REWRITER_CHUNK_SIZE);

    const contents = AGENT_SCRIPT_REWRITER_PROMPT
      .replace('__CONTEXT__', contextBlocks.length
        ? JSON.stringify(contextBlocks.map(b => ({ audioScript: b.audioScript, russianScript: b.russianScript, blockType: b.blockType })))
        : '(none — this is the first batch)')
      .replace('__BLOCKS__', JSON.stringify(chunkBlocks));

    const chunkResult = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text ?? '';
      const parsed = safeJsonParse<ScriptBlock[]>(text, `Rewriter chunk ${i + 1}/${totalChunks}`);
      // Merge: preserve original non-text fields, use rewritten audioScript/russianScript
      return chunkBlocks.map((orig, idx) => ({
        ...orig,
        audioScript: parsed[idx]?.audioScript ?? orig.audioScript,
        russianScript: parsed[idx]?.russianScript ?? orig.russianScript,
      }));
    }, `runScriptRewriterAgent chunk ${i + 1}`, signal);

    result.push(...chunkResult);
    onChunkDone(result.length, script.length);
  }

  return result;
};

export const runAuditFixAgent = async (
  script: ScriptBlock[],
  targetIndices: number[],
  blockIssues: Record<number, string[]>,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<ScriptBlock[]> => {
  const result = [...script];
  const CHUNK_SIZE = 20;
  // Split targetIndices into chunks of CHUNK_SIZE
  const chunks: number[][] = [];
  for (let i = 0; i < targetIndices.length; i += CHUNK_SIZE) chunks.push(targetIndices.slice(i, i + CHUNK_SIZE));

  let doneCount = 0;
  for (let ci = 0; ci < chunks.length; ci++) {
    if (signal?.aborted) throw new Error('Operation cancelled by user.');
    const idxChunk = chunks[ci];
    const contextBlocks = script.slice(Math.max(0, idxChunk[0] - 3), idxChunk[0]);
    const chunkBlocks = idxChunk.map(i => script[i]);
    const chunkIssues = idxChunk.map((i, pos) => `Block ${pos}: ${(blockIssues[i] ?? []).join(', ')}`).join('\n');

    const prompt = AGENT_AUDIT_FIX_PROMPT
      .replace('__CONTEXT__', contextBlocks.length
        ? JSON.stringify(contextBlocks.map(b => ({ audioScript: b.audioScript, russianScript: b.russianScript, blockType: b.blockType })))
        : '(none)')
      .replace('__BLOCKS__', JSON.stringify(chunkBlocks))
      .replace('__BLOCK_ISSUES__', chunkIssues);

    const fixed = await withRetry(async () => {
      const response = await getClient().models.generateContent({
        model: getModel('SCOUT'),
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      return safeJsonParse<ScriptBlock[]>(response.text ?? '', `AuditFix chunk ${ci + 1}/${chunks.length}`);
    }, `runAuditFixAgent chunk ${ci + 1}`, signal);

    idxChunk.forEach((origIdx, pos) => {
      result[origIdx] = {
        ...result[origIdx],
        audioScript: fixed[pos]?.audioScript ?? result[origIdx].audioScript,
        russianScript: fixed[pos]?.russianScript ?? result[origIdx].russianScript,
      };
    });
    doneCount += idxChunk.length;
    onProgress(doneCount, targetIndices.length);
  }
  return result;
};

// --- INLINE BLOCK TRANSLATOR (EN → RU) ---
// Flash call to translate a single audioScript block to Russian.
export const translateBlockToRussian = async (
  audioScript: string,
  signal?: AbortSignal
): Promise<string | null> => {
  const ai = getClient();
  const model = getModel('SCOUT'); // Flash is sufficient for translation
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Translate the following English audio script block to Russian. Keep the same tone, voice, and emphasis. Output ONLY the Russian translation, no commentary.\n\n${audioScript}`,
      config: { abortSignal: signal },
    });
    return response.text?.trim() ?? null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Block translation failed", { message });
    return null;
  }
};
