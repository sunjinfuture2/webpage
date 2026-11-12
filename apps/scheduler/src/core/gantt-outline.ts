/** Prefix positions keep summary rows and editable task rows on one time axis. */
export function outlineOffsets(kinds: Array<'phase' | 'task'>, phaseHeight = 64, taskHeight = 38) {
  const offsets = [0];
  for (const kind of kinds) offsets.push(offsets.at(-1)! + (kind === 'phase' ? phaseHeight : taskHeight));
  return offsets;
}

export function outlineIndexAt(offsets: number[], y: number) {
  let lo = 0, hi = Math.max(0, offsets.length - 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (offsets[mid] <= y) lo = mid; else hi = mid - 1;
  }
  return lo;
}
