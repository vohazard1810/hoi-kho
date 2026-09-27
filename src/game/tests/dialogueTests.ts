import { DialogueSystem } from '../systems/DialogueSystem';

export interface DialogueTestResult { testName: string; passed: boolean; message: string; }

export function runDialogueTests(): { results: DialogueTestResult[] } {
  const results: DialogueTestResult[] = [];
  {
    const system = new DialogueSystem(); let completed = 0;
    system.start([{ speaker: 'A', text: 'One' }, { speaker: 'B', text: 'Two' }], () => completed++);
    const first = system.getSnapshot(); system.advance(); const second = system.getSnapshot(); system.advance();
    const passed = first.index === 0 && first.total === 2 && second.index === 1 && !system.isActive() && completed === 1;
    results.push({ testName: 'Dialogue advances deterministically and completes once', passed, message: passed ? 'Two-line sequence pauses, advances, and invokes completion once' : 'Dialogue sequencing mismatch' });
  }
  {
    const system = new DialogueSystem(); let completed = 0;
    system.start([{ speaker: 'A', text: 'One' }], () => completed++); system.skip(); system.skip();
    const passed = completed === 1 && !system.isActive();
    results.push({ testName: 'Dialogue skip is safe and idempotent', passed, message: passed ? 'Esc-style skip cannot duplicate side effects' : 'Skip invoked completion more than once' });
  }
  {
    const system = new DialogueSystem();
    const first = system.start([{ speaker: 'A', text: 'One' }]);
    const nested = system.start([{ speaker: 'B', text: 'Two' }]);
    const passed = first && !nested && system.getSnapshot().line?.speaker === 'A';
    results.push({ testName: 'Active dialogue rejects overlapping narrative triggers', passed, message: passed ? 'Encounter triggers cannot overwrite an active conversation' : 'Dialogue was overwritten by a nested trigger' });
  }
  return { results };
}
