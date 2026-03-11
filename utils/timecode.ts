/** Parse "MM:SS" or "HH:MM:SS" to total seconds. */
export function parseTimecode(tc: string): number {
  const parts = tc.trim().split(":").map(Number);
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  }
  throw new Error(`Invalid timecode format: "${tc}"`);
}

/** Format total seconds to "MM:SS" or "HH:MM:SS" (HH only if >= 60 min). */
export function formatTimecode(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/** Parse "MM:SS - MM:SS" (or HH:MM:SS variant) range to start/end in seconds. */
export function parseTimecodeRange(tc: string): { start: number; end: number } {
  const [startStr, endStr] = tc.split("-").map((s) => s.trim());
  if (!startStr || !endStr) {
    throw new Error(`Invalid timecode range: "${tc}"`);
  }
  return { start: parseTimecode(startStr), end: parseTimecode(endStr) };
}

/** Format total seconds to SRT subtitle format: "HH:MM:SS,000". */
export function formatSrtTimecode(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);

  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},` +
    `${String(ms).padStart(3, "0")}`
  );
}
