export type GridDirection = 'left' | 'right' | 'up' | 'down';

/** Predictable clamped navigation for modal grids. */
export function moveGridSelection(
  index: number,
  direction: GridDirection,
  itemCount: number,
  columns = 2
): number {
  if (itemCount <= 0 || columns <= 0) return 0;
  const safeIndex = Math.max(0, Math.min(itemCount - 1, index));
  const column = safeIndex % columns;

  if (direction === 'left') return column > 0 ? safeIndex - 1 : safeIndex;
  if (direction === 'right') return column < columns - 1 && safeIndex + 1 < itemCount ? safeIndex + 1 : safeIndex;
  if (direction === 'up') return safeIndex - columns >= 0 ? safeIndex - columns : safeIndex;
  return safeIndex + columns < itemCount ? safeIndex + columns : safeIndex;
}
