import Papa from 'papaparse';
import type { ScriptBlock } from '../types';

/**
 * Parse a CSV file exported from Tech.War (Editor Task format).
 * Columns: timecode, blockType, visualCue, audioScript, russianScript
 */
export function parseCSVText(text: string): ScriptBlock[] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length < 2) throw new Error('No rows found in CSV');

  // Skip header row
  const blocks: ScriptBlock[] = rows.slice(1).map((fields) => ({
    timecode: fields[0]?.trim() ?? '',
    blockType: (fields[1]?.trim() ?? 'BODY') as ScriptBlock['blockType'],
    visualCue: fields[2]?.trim() ?? '',
    audioScript: fields[3]?.trim() ?? '',
    russianScript: fields[4]?.trim() ?? '',
    overlayFX: '',
  })).filter(b => b.timecode || b.audioScript);

  if (!blocks.length) throw new Error('No rows found in CSV');
  return blocks;
}

/**
 * Parse raw text extracted from a .doc/.docx file exported from Tech.War (Script format).
 * Each block is identified by a timecode line followed by VISUAL:, AUDIO (EN):, AUDIO (RU): fields.
 */
export function parseDocxText(rawText: string, onDiag?: (msg: string) => void): ScriptBlock[] {
  // Normalize: tabs (Word table cells) → newlines, then split on \r\n or \n
  const rawLines = rawText.replace(/\u00a0/g, ' ').replace(/\t/g, '\n').split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Re-join labels Word HTML splits across leaf elements:
  //   "AUDIO" + "(EN): text" → "AUDIO (EN): text"
  //   "VISUAL" + ": text"    → "VISUAL: text"
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i], nx = rawLines[i + 1] ?? '';
    if ((l === 'AUDIO' || l === 'VISUAL') && /^\(/.test(nx)) { lines.push(l + ' ' + nx); i++; }
    else if ((l === 'AUDIO' || l === 'VISUAL') && /^[：:]/.test(nx)) { lines.push(l + nx); i++; }
    else { lines.push(l); }
  }

  // [BLOCKTYPE] is optional — Word may strip or separate the brackets
  const tcPattern = /^(\d{1,2}:\d{2}(?::\d{2})?\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?)(?:\s*\[([A-Z]+)\])?/;
  const mVisual  = (l: string) => l.match(/^VISUAL\s*[：:]\s*(.*)/i);
  const mAudioEn = (l: string) => l.match(/^AUDIO\s*[\u0028\uff08]EN[\u0029\uff09]\s*[：:]\s*(.*)/i);
  const mAudioRu = (l: string) => l.match(/^AUDIO\s*[\u0028\uff08]RU[\u0029\uff09]\s*[：:]\s*(.*)/i);

  if (onDiag) {
    const tcLines = lines.filter(l => tcPattern.test(l));
    const tc6idx = lines.findIndex((l, i) => i > 0 && tcPattern.test(l) && lines.slice(0, i).filter(ll => tcPattern.test(ll)).length === 5);
    const audioLineNear6 = lines.slice(tc6idx, tc6idx + 10).find(l => l.toUpperCase().includes('AUDIO'));
    const charCodes = audioLineNear6 ? [...audioLineNear6.slice(0, 20)].map(c => c.charCodeAt(0).toString(16)).join(' ') : 'none';
    onDiag(`>>> PARSE DIAG: ${lines.length} lines | ${tcLines.length} timecodes\n  TC6 AUDIO line: "${audioLineNear6?.slice(0, 40)}"\n  char codes: ${charCodes}`);
  }

  const isMarker = (l: string) => tcPattern.test(l) || !!mVisual(l) || !!mAudioEn(l) || !!mAudioRu(l);

  const blocks: ScriptBlock[] = [];
  let current: Partial<ScriptBlock> | null = null;
  let activeField: 'visualCue' | 'audioScript' | 'russianScript' | null = null;

  for (const line of lines) {
    const tcMatch = line.match(tcPattern);
    if (tcMatch) {
      if (current?.audioScript) blocks.push({ timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY', ...current });
      current = { timecode: tcMatch[1].trim(), blockType: (tcMatch[2] as ScriptBlock['blockType']) ?? 'BODY', visualCue: '', overlayFX: '', audioScript: '', russianScript: '' };
      activeField = null;
      // Single-line block: all fields merged after the timecode
      const rest = line.slice(tcMatch[0].length).trim();
      if (mAudioEn(rest)) {
        const vm = rest.match(/VISUAL\s*[：:]\s*(.*?)(?=AUDIO\s*[\u0028\uff08]EN[\u0029\uff09])/i);
        const em = mAudioEn(rest);
        const rm = mAudioRu(rest);
        if (vm) current.visualCue = vm[1].trim();
        if (em) current.audioScript = em[1].split(/AUDIO\s*[\u0028\uff08]RU[\u0029\uff09]/i)[0].trim();
        if (rm) current.russianScript = rm[1].trim();
      }
    } else if (current) {
      const vm = mVisual(line); const em = mAudioEn(line); const rm = mAudioRu(line);
      if (vm) { current.visualCue = vm[1]; activeField = 'visualCue'; }
      else if (em) { current.audioScript = em[1]; activeField = 'audioScript'; }
      else if (rm) { current.russianScript = rm[1]; activeField = 'russianScript'; }
      else if (activeField && !isMarker(line)) {
        current[activeField] = (current[activeField] ?? '') + ' ' + line;
      }
    }
  }
  if (current?.audioScript) blocks.push({ timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY', ...current });
  if (!blocks.length) throw new Error('No script blocks found in document. Make sure the file was exported from Tech.War.');
  return blocks;
}
