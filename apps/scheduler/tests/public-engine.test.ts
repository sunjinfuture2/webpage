import { describe, expect, it } from 'vitest';
import { calculate } from '../src/core/engine';
import { validatedPlan } from '../src/core/commands';
import { addMonths, isDay } from '../src/core/dates';
import { backupText, importFile, makeXlsx, parseBackup, toCSV } from '../src/core/files';
import { plan, workspace } from './fixtures';
import type { LinkType } from '../src/core/types';

describe('calendar-day scheduling with synthetic tasks', () => {
  it.each<[LinkType, number, string, string]>([
    ['FS', 0, '2030-01-13', '2030-01-14'],
    ['FS', -2, '2030-01-11', '2030-01-12'],
    ['SS', 2, '2030-01-12', '2030-01-13'],
    ['FF', 2, '2030-01-13', '2030-01-14'],
    ['SF', -2, '2030-01-07', '2030-01-08'],
  ])('%s lag %s obeys its endpoints', (type, lag, start, finish) => {
    const p = plan();
    p.dependencies.push({ id: 'edge', sourceId: 'synthetic', from: 'T1', to: 'T2', type, lag, active: true, condition: '' });
    const r = calculate(p);
    expect(r.tasks.T2.start).toBe(start); expect(r.tasks.T2.finish).toBe(finish);
    expect(r.issues.some(i => i.code === 'relationship-violation')).toBe(false);
  });
  it('propagates delays without changing references or the source plan', () => {
    const p = plan();
    p.dependencies.push({ id: 'edge', sourceId: 'synthetic', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' });
    const before = JSON.stringify(p);
    const changed = validatedPlan(p, d => { d.tasks[0].delay = 4; });
    expect(calculate(changed).tasks.T2.start).toBe('2030-01-17');
    expect(changed.tasks[0].referenceFinish).toBe('2030-01-12');
    expect(JSON.stringify(p)).toBe(before);
  });
  it('rejects a cyclic mutation atomically', () => {
    const p = plan(), before = JSON.stringify(p);
    expect(() => validatedPlan(p, d => {
      d.dependencies.push(
        { id: 'one', sourceId: 'synthetic', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' },
        { id: 'two', sourceId: 'synthetic', from: 'T2', to: 'T1', type: 'FS', lag: 0, active: true, condition: '' },
      );
    })).toThrow('순환');
    expect(JSON.stringify(p)).toBe(before);
  });
  it('retains actual dates and reports relationships they violate', () => {
    const p = plan();
    p.dependencies.push({ id: 'edge', sourceId: 'synthetic', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' });
    p.tasks[1].actualStart = '2030-01-01'; p.tasks[1].actualFinish = '2030-01-02';
    const r = calculate(p);
    expect(r.tasks.T2.start).toBe('2030-01-01');
    expect(r.issues.some(i => i.code === 'relationship-violation')).toBe(true);
  });
  it('clamps month anchors and validates calendar dates', () => {
    expect(addMonths('2032-02-29', 12)).toBe('2033-02-28');
    expect(addMonths('2030-01-31', 1)).toBe('2030-02-28');
    expect(isDay('2030-02-29')).toBe(false);
  });
});
describe('portable data without bundled business documents', () => {
  it('round-trips scenarios and nullable fields through JSON', () => {
    const w = workspace(), scenario = structuredClone(w.scenarios[0]);
    scenario.id = 'alternative'; scenario.tasks[0].primary = '테스트 담당';
    w.scenarios.push(scenario); w.activeId = scenario.id;
    expect(parseBackup(backupText(w))).toEqual(w);
    expect(parseBackup(backupText(w)).scenarios[0].tasks[0].progress).toBeNull();
    expect(() => parseBackup('{"schemaVersion":99}')).toThrow();
  });
  it('round-trips XLSX without formula execution or losing backup data', async () => {
    const w = workspace(), p = w.scenarios[0];
    p.tasks[0].primary = '테스트 담당';
    const bytes = await makeXlsx(w, p, calculate(p));
    expect(new Uint8Array(bytes).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
    expect(await importFile(new File([bytes], 'synthetic.xlsx'))).toEqual(w);
  }, 15000);
  it('keeps null and zero distinct and escapes formula-like CSV strings', () => {
    expect(toCSV([[null, 0, '=1+1', 'T1']])).toBe('\ufeff,0,"\'=1+1","T1"');
  });
});
