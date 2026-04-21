export type Unit = {
  key: 'm' | 'h' | 'd' | 'w' | 'mo' | 'y';
  label: string;
  seconds: number;
};

export const UNITS_SHORT: Unit[] = [
  { key: 'm', label: 'minutes', seconds: 60 },
  { key: 'h', label: 'hours', seconds: 3600 },
  { key: 'd', label: 'days', seconds: 86400 },
  { key: 'w', label: 'weeks', seconds: 604800 },
];

export const UNITS_LONG: Unit[] = [
  ...UNITS_SHORT,
  { key: 'mo', label: 'months', seconds: 2592000 },
  { key: 'y', label: 'years', seconds: 31536000 },
];

export function decomposeSeconds(total: number, units: Unit[]): { amount: number; unit: Unit } {
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    if (total % u.seconds === 0 && total / u.seconds >= 1) {
      return { amount: total / u.seconds, unit: u };
    }
  }
  const fallback = units[0];
  return { amount: Math.max(1, Math.round(total / fallback.seconds)), unit: fallback };
}

export function formatExpiryAbsolute(seconds: number, now = Date.now()): string {
  const d = new Date(now + seconds * 1000);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  if (seconds < 604800) {
    const d = Math.round(seconds / 86400);
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (seconds < 2592000) {
    const w = Math.round(seconds / 604800);
    return `${w} week${w === 1 ? '' : 's'}`;
  }
  if (seconds < 31536000) {
    const mo = Math.round(seconds / 2592000);
    return `${mo} month${mo === 1 ? '' : 's'}`;
  }
  const y = Math.round(seconds / 31536000);
  return `${y} year${y === 1 ? '' : 's'}`;
}
