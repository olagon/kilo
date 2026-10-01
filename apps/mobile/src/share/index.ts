import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { daysBetween, LAUNCH_DATE, shareText, shortDateLabel, type DayRecord } from '@huli/shared';
import { formatDistance } from '../format';
import { renderShareCard } from './card';

export const SHARE_LINK = 'https://olagon.github.io/kilo';

export function dayNumber(date: string): number {
  return daysBetween(LAUNCH_DATE, date) + 1;
}

/** Share today's result as text plus an image card. Falls back to text, then to the clipboard. */
export async function shareDay(rec: DayRecord, playerName: string, units: 'mi' | 'km'): Promise<'shared' | 'copied' | 'failed'> {
  const distances = rec.rounds.map((r) => formatDistance(r.distanceM, units));
  const input = { dayNumber: dayNumber(rec.date), dateLabel: shortDateLabel(rec.date), total: rec.total, rounds: rec.rounds, distances, link: SHARE_LINK };
  const text = shareText(input);
  let fileUri: string | null = null;
  try {
    const dataUrl = await renderShareCard({ ...input, playerName });
    const written = await Filesystem.writeFile({ path: `kilo-${rec.date}.png`, data: dataUrl.split(',')[1]!, directory: Directory.Cache });
    fileUri = written.uri;
  } catch {
    fileUri = null;
  }
  try {
    await Share.share({ title: `Kilo #${input.dayNumber}`, text, dialogTitle: 'Share your day', ...(fileUri ? { files: [fileUri] } : {}) });
    return 'shared';
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
