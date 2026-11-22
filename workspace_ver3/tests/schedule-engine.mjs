// Engine regression for the schedule bundle (node tests/schedule-engine.mjs). No server needed.
// The dates must match the SUNJIN Schedule app for the same source file.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const out = await build({ entryPoints: [path.join(root, 'schedule/index.ts')], bundle: true, format: 'iife', write: false, target: ['es2020'], legalComments: 'none' });
const ctx = { performance, structuredClone, crypto, Intl, console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(out.outputFiles[0].text, ctx);
const A = ctx.AIDCSchedule; let passed = 0, failed = 0;
const check = (name, ok, detail) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); } };
const source = JSON.parse(await fs.readFile(path.join(root, 'public/schedule/pangyo.json'), 'utf8'));
const base = A.planFromSource(source), r0 = A.calculate(base);
const byWbs = Object.fromEntries(base.tasks.map(t => [t.wbs, t]));

console.log('— the bundled Pangyo plan');
check('233 tasks, 511 relations (508 active), 16 procurement packages', base.tasks.length === 233 && base.dependencies.length === 511 && base.dependencies.filter(e => e.active).length === 508 && base.procurement.length === 16, [base.tasks.length, base.dependencies.length, base.procurement.length]);
check('operation start is forecast for 2028-09-28 with no delay', r0.operationDate === '2028-09-28' && r0.operationDelay === 0 && r0.operationValid, [r0.operationDate, r0.operationDelay]);
const sat = A.validatedPlan(base, d => { d.tasks.find(t => t.wbs === 'W7.8').delay = 1; });
check('one more day on the 20-rack SAT (W7.8) moves it to 2028-09-29', A.calculate(sat).operationDate === '2028-09-29', A.calculate(sat).operationDate);
const delays = {}; for (const t of base.tasks) { const p = A.validatedPlan(base, d => { d.tasks.find(x => x.id === t.id).delay = 7; }); const o = A.calculate(p).operationDate; if (o !== '2028-09-28') delays[t.wbs] = o; }
const to1003 = Object.entries(delays).filter(([, o]) => o === '2028-10-03').map(([w]) => w);
check('a 7-day delay of an NVIS-path task moves it to 2028-10-03', to1003.length > 0, { to1003: to1003.slice(0, 12), other: Object.entries(delays).filter(([, o]) => o !== '2028-10-03').slice(0, 6) });

console.log('— overrides');
check('no overrides give the base plan back', JSON.stringify(A.applyOverrides(base, {}).tasks) === JSON.stringify(base.tasks));
const t1 = byWbs['W1.1'], dep = base.dependencies[0];
const ov = { cfg: { statusDate: '2026-11-19' }, ['t:' + t1.id]: { delay: 3, status: '진행', actualStart: '2026-11-03' }, ['d:' + dep.id]: { lag: 2 }, ['p:' + base.procurement[0].id]: { delay: 5 }, 'g:G1': { status: '승인' }, 'c:x': 1 };
const p1 = A.applyOverrides(base, ov);
check('task, relation, procurement and status-date changes are applied; other keys are ignored', p1.statusDate === '2026-11-19' && p1.tasks.find(t => t.id === t1.id).delay === 3 && p1.tasks.find(t => t.id === t1.id).actualStart === '2026-11-03' && p1.dependencies.find(e => e.id === dep.id).lag === 2 && p1.procurement[0].delay === 5);
check('the base plan itself is not touched', t1.delay === 0 && dep.lag !== 2 || base.dependencies[0].lag === dep.lag);
const back = A.diffPlans(base, p1);
check('diffPlans gives exactly those overrides back', JSON.stringify(Object.keys(back).sort()) === JSON.stringify(Object.keys(ov).filter(A.isPlanKey).sort()) && ['delay', 'status', 'actualStart'].every(f => back['t:' + t1.id][f] === ov['t:' + t1.id][f]) && Object.keys(back['t:' + t1.id]).length === 3, back);
const nt = A.newTask(p1, 'W1'); const p2 = A.validatedPlan(p1, d => { d.tasks.push(nt); d.dependencies.push(A.newDependency(t1.id, nt.id, 'FS', 0)); });
const ch = A.overrideChanges(base, ov, p2); const ov2 = { ...ov }; for (const [k, v] of Object.entries(ch)) { if (v === null) delete ov2[k]; else ov2[k] = v; }
const p3 = A.applyOverrides(base, ov2);
check('a new task and its relation are stored as _new overrides and come back', Object.keys(ch).length === 2 && p3.tasks.some(t => t.id === nt.id && t.wbs === 'W1.16') && p3.dependencies.some(e => e.to === nt.id) && ov2['g:G1'].status === '승인', Object.keys(ch));
const p4 = A.validatedPlan(p3, d => { A.removeTasks(d, [nt.id]); }); const ch2 = A.overrideChanges(base, ov2, p4);
check('removing them again removes the overrides', Object.values(ch2).every(v => v === null) && Object.keys(ch2).length === 2, ch2);
const p5 = A.validatedPlan(base, d => { A.removeTasks(d, [byWbs['W1.2'].id]); }); const ov5 = A.diffPlans(base, p5);
check('deleting a source task is one _del override (its relations go with it)', Object.keys(ov5).length === 1 && ov5['t:' + byWbs['W1.2'].id]._del === true && A.applyOverrides(base, ov5).tasks.length === 232 && A.applyOverrides(base, ov5).dependencies.every(e => e.from !== byWbs['W1.2'].id && e.to !== byWbs['W1.2'].id), Object.keys(ov5));
let cyc = ''; try { A.validatedPlan(base, d => { d.dependencies.push(A.newDependency(byWbs['W8.6'].id, byWbs['W1.1'].id)); }); } catch (e) { cyc = e.message; }
check('a relation that closes a loop is refused', /순환/.test(cyc), cyc);

const pk = { id: '추가x', name: '시험 패키지', poTaskId: byWbs['W4.30'].id, deliveryTaskId: byWbs['W5.37'].id, installTaskId: byWbs['W5.37'].id, satTaskId: byWbs['W5.37'].id, delay: 0, leadWeeks: null, trigger: '미확정', triggerDate: null, transport: 0, commitment: '미확약', supplier: '', evidence: '', sourceIndex: -1 };
const p6 = A.validatedPlan(base, d => { d.procurement.push(pk); }), ov6 = A.diffPlans(base, p6);
check('a package a member adds is one _new override and comes back', Object.keys(ov6).length === 1 && ov6['p:추가x']._new === true && A.applyOverrides(base, ov6).procurement.length === 17 && A.calculate(A.applyOverrides(base, ov6)).operationDate === '2028-09-28', Object.keys(ov6));
const p7 = A.validatedPlan(p6, d => { d.procurement = d.procurement.filter(x => x.id !== '추가x'); });
check('…and removing it removes the override', Object.keys(A.overrideChanges(base, ov6, p7)).length === 1 && A.overrideChanges(base, ov6, p7)['p:추가x'] === null);
const ov8 = { ['p:' + base.procurement[0].id]: { _del: true } };
check('a source package can be left out (_del) without touching the others', A.applyOverrides(base, ov8).procurement.length === 15 && JSON.stringify(A.diffPlans(base, A.applyOverrides(base, ov8))) === JSON.stringify(ov8));

console.log('— weighted progress');
const P = A.progress, w1 = base.tasks.filter(t => t.phase === 'W1');
const g0 = P.of(w1, r0, () => undefined, '2026-11-19');
check('phase 1: nothing finished gives 0 %', g0.total === 15 && g0.done === 0 && g0.pct === 0, g0);
const half = A.applyOverrides(base, Object.fromEntries(w1.slice(0, 7).map(t => ['t:' + t.id, { status: '완료', actualStart: t.plannedStart, actualFinish: t.plannedFinish }])));
const rh = A.calculate(half), gh = P.of(half.tasks.filter(t => t.phase === 'W1'), rh, () => undefined, '2026-11-19');
check('finishing 7 of 15 gives a share weighted by duration, importance and milestones (not simply 7/15)', gh.done === 7 && gh.pct > 0.2 && gh.pct < 0.8 && Math.abs(gh.pct - 7 / 15) > 0.005, gh);
const ms = w1.find(t => t.kind === 'milestone'), tk = w1.find(t => t.kind === 'task');
check('a milestone weighs sqrt(14) x 1.5; high importance weighs 1.5x, low 0.7x', Math.abs(P.weight(ms, r0, 'mid') - Math.sqrt(14) * 1.5) < 1e-9 && Math.abs(P.weight(tk, r0, 'high') / P.weight(tk, r0, 'mid') - 1.5) < 1e-9 && Math.abs(P.weight(tk, r0, 'low') / P.weight(tk, r0, 'mid') - 0.7) < 1e-9);
const started = { ...tk, actualStart: r0.tasks[tk.id].start, status: '진행' };
check('a started task counts for the share of its duration that has passed (never more than 90 %)', P.achievement(started, r0, r0.tasks[tk.id].start) > 0 && P.achievement(started, r0, '2030-01-01') === 0.9 && P.achievement({ ...tk, progress: 0.4 }, r0, '2026-11-19') === 0.4 && P.achievement(tk, r0, '2026-11-19') === 0);
check('importance defaults from the path to operation start', ['high', 'mid', 'low'].includes(P.defaultPriority(r0, tk.id)) && base.tasks.some(t => P.defaultPriority(r0, t.id) === 'high') && base.tasks.some(t => P.defaultPriority(r0, t.id) === 'low'));

console.log('— relation map');
const net = A.network(base, r0, { focusId: byWbs['W7.8'].id, depth: 1, direction: 'both', all: false, includeInactive: false });
check('one level around the SAT task lays out its direct neighbours', net.nodes.length > 2 && net.nodes.some(n => n.task.id === byWbs['W7.8'].id) && net.routes.length === net.edges.length, { nodes: net.nodes.length, edges: net.edges.length });
const path1 = A.drivingPath(base, r0);
check('the path that decides the operation date ends at W8.6', path1.length >= 2 && path1[path1.length - 1].wbs === 'W8.6', path1.map(s => s.wbs).join(' > '));
console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
