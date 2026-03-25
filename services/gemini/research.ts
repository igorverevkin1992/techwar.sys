import { Type, ResearchDossier } from './client';
import { getClient, withRetry, safeJsonParse, getToolsForModel, formatRadarOutput, RadarAnalysis } from './client';
import { getModel } from './client';
import { AGENT_LENS_PROMPT, AGENT_RESEARCH_PROMPT } from './client';

export const runRadarAgent = async (topic: string, signal?: AbortSignal): Promise<string> => {
  const model = getModel('RADAR');
  return withRetry(async () => {
    const ai = getClient();
    const stream = await ai.models.generateContentStream({
      model,
      contents: `TOPIC: ${topic}

${AGENT_LENS_PROMPT}`,
      config: {
        temperature: 0.7,
        abortSignal: signal,
      }
    });
    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) throw new Error('Operation cancelled by user.');
      fullText += chunk.text ?? '';
    }
    if (!fullText) throw new Error('Radar returned empty analysis.');
    const parsed = safeJsonParse<RadarAnalysis>(fullText, 'Radar');
    return formatRadarOutput(parsed);
  }, 'runRadarAgent', signal);
};

export const runAnalystAgent = async (topic: string, radarAnalysis: string, signal?: AbortSignal, scoutHook?: string): Promise<ResearchDossier> => {
  const model = getModel('ANALYST');
  return withRetry(async () => {
    const ai = getClient();

    // Original working config: responseSchema + googleSearch, no safetySettings.
    // safetySettings caused TCP disconnect on Pro models; removed.
    // googleSearch works on gemini-3-pro-preview (3.0), was issue only with 3.1-pro.
    const tools = getToolsForModel(model);
    const primaryEventBlock = scoutHook
      ? `PRIMARY EVENT — THIS IS THE ACTUAL STORY (anchor ALL research to this specific event):\n${scoutHook}\n\nSearch for this EXACT event first. Find the specific post, video, or publication. Historical context is secondary — never let secondary evidence replace the primary event.\n\n`
      : '';
    const response = await ai.models.generateContent({
      model,
      contents: `CRITICAL TOPIC LOCK — read before anything else:\nResearch EXCLUSIVELY the following topic. If the Lens Analysis mentions related films, events, or institutions, use them as context only — do NOT redirect research to them.\nTOPIC: ${topic}\n\n${primaryEventBlock}SEARCH DIRECTIVES — execute these exact queries first:
${radarAnalysis}

IMPORTANT: The queries above are your starting search terms. Execute them literally. Do NOT research events or films not mentioned in the PRIMARY EVENT or queries above.

${AGENT_RESEARCH_PROMPT}`,
      config: {
        tools,
        abortSignal: signal,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic:         { type: Type.STRING },
            visualEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
            smokingGun: {
              type: Type.OBJECT,
              properties: {
                source:       { type: Type.STRING },
                url:          { type: Type.STRING },
                quote_or_fact: { type: Type.STRING },
              },
              required: ["source", "url", "quote_or_fact"],
            },
            contextPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ["label", "value"],
              },
            },
          },
          required: ["topic", "visualEvidence", "smokingGun", "contextPoints"],
        },
      }
    });

    const text = response.text;
    if (!text) throw new Error("Analyst returned empty data.");
    return safeJsonParse<ResearchDossier>(text, 'Analyst');
  }, 'runAnalystAgent', signal);
};
