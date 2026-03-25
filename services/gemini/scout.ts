import { HarmCategory, HarmBlockThreshold, TopicSuggestion } from './client';
import { getClient, withRetry, extractResponseText, extractJson, getToolsForModel } from './client';
import { getModel } from './client';
import { AGENT_SCOUT_PROMPT } from './client';

export const runScoutAgent = async (signal?: AbortSignal): Promise<TopicSuggestion[]> => {
  const model = getModel('SCOUT');
  return withRetry(async () => {
    const ai = getClient();
    const tools = getToolsForModel(model);

    // googleSearch grounding is incompatible with responseMimeType/responseSchema —
    // use free-text response and extract JSON manually.
    // safetySettings BLOCK_NONE required: geopolitical/military research triggers default filters.
    const today = new Date().toISOString().slice(0, 10); // e.g. "2026-03-08"
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }); // e.g. "March 2026"
    const response = await ai.models.generateContent({
      model,
      contents: `TODAY'S DATE: ${today}. SEARCH WINDOW: ${weekAgo} to ${today} (last 7 days). Search for tech-geopolitics events — chip bans, surveillance tools, cyber attacks, Big Tech government contracts, platform censorship — that occurred OR went viral during this period. Events from ANY day within the last 7 days are valid candidates.\n\n${AGENT_SCOUT_PROMPT.replace(/__WEEK__/g, monthYear)}`,
      config: {
        tools,
        abortSignal: signal,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    const text = extractResponseText(response, 'Scout');
    if (!text) throw new Error("Scout returned empty intel.");
    const topics = extractJson<TopicSuggestion[]>(text, 'Scout');

    // Build Google Search URLs from the model's own searchQuery field (reliable, always relevant)
    return topics.map(topic => ({
      ...topic,
      sourceUrl: topic.searchQuery
        ? `https://www.google.com/search?q=${encodeURIComponent(topic.searchQuery)}`
        : undefined,
    }));
  }, 'runScoutAgent', signal);
};
