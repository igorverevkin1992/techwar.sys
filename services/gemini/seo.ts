import { ScriptBlock, SeoPackage } from './client';
import { getClient, withRetry, safeJsonParse } from './client';
import { getModel } from './client';
import { AGENT_SEO_PROMPT } from './client';

export const runSEOAgent = async (
  topic: string,
  radarOutput: string | undefined,
  script: ScriptBlock[],
  signal?: AbortSignal
): Promise<SeoPackage | null> => {
  const ai = getClient();
  const model = getModel('SCOUT'); // Flash is sufficient for SEO generation
  const scriptExcerpt = [
    ...script.slice(0, 10),
    ...script.slice(-10),
  ].map(b => `[${b.blockType}] ${b.audioScript}`).join('\n');

  const contents = [
    AGENT_SEO_PROMPT,
    `\nTOPIC: ${topic}`,
    radarOutput ? `\nRADAR HYPOTHESES:\n${radarOutput.substring(0, 1500)}` : '',
    `\nSCRIPT EXCERPT (first+last 10 blocks):\n${scriptExcerpt}`,
  ].join('');

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json' },
    });
    const text = response.text ?? '';
    return safeJsonParse<SeoPackage>(text, 'SEO Agent');
  }, 'runSEOAgent', signal);
};
