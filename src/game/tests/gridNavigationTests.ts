import { moveGridSelection } from '../core/GridNavigation';

export interface GridNavigationTestResult { testName: string; passed: boolean; message: string; }

export function runGridNavigationTests(): { results: GridNavigationTestResult[] } {
  const results: GridNavigationTestResult[] = [];
  const cases: Array<[number, 'left' | 'right' | 'up' | 'down', number]> = [
    [0, 'left', 0], [0, 'right', 1], [1, 'right', 1], [1, 'left', 0],
    [0, 'up', 0], [1, 'up', 1], [2, 'up', 0], [3, 'up', 1],
    [8, 'down', 10], [9, 'down', 11], [10, 'down', 10], [11, 'down', 11],
  ];
  const failures = cases.filter(([index, direction, expected]) => moveGridSelection(index, direction, 12, 2) !== expected);
  results.push({
    testName: 'Equipment grid supports clamped four-direction navigation',
    passed: failures.length === 0,
    message: failures.length === 0 ? 'All 12-card edge and column transitions preserve the 2x6 layout' : `Failed ${failures.length} transitions`,
  });
  return { results };
}
