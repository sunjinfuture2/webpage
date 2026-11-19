// The shared schedule of a project is the bundled source plan plus a flat set of changes ("overrides") kept on the server
// in the record meta:sched:<project>. One field per changed thing, so two members changing different tasks never collide:
//   cfg            { statusDate?, powerRoute? }
//   t:<task id>    changed task fields | { _new: true, ...whole task } | { _del: true }
//   d:<link id>    changed dependency fields | { _new: true, ...whole dependency } | { _del: true }
//   p:<package id> changed procurement fields | { _new: true, ...whole package } | { _del: true }
// Other prefixes (g: gate state, e: evidence state, sc: scenarios, c: content links) do not affect the calculation and are left alone here.
import type { Dependency, Plan, Procurement, Task } from './core/types';

export type Overrides = Record<string, any>;
// equal whatever the order of the keys (a record that went to the server and back may list them differently)
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map(k => [k, canon((v as any)[k])])) : v ?? null;
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const TASK_FIXED = new Set(['id']);

export function applyOverrides(base: Plan, ov: Overrides | null | undefined): Plan {
  const plan: Plan = clone(base); if (!ov) return plan;
  const cfg = ov.cfg || {};
  if (typeof cfg.statusDate === 'string') plan.statusDate = cfg.statusDate;
  if (cfg.powerRoute === '9800' || cfg.powerRoute === '5000') plan.powerRoute = cfg.powerRoute;
  const tasks = new Map(plan.tasks.map(t => [t.id, t])), gone = new Set<string>();
  const links = new Map(plan.dependencies.map(e => [e.id, e])), cut = new Set<string>();
  const pkgs = new Map(plan.procurement.map(x => [x.id, x])), lost = new Set<string>();
  for (const [key, v] of Object.entries(ov)) {
    if (!v || typeof v !== 'object') continue;
    const id = key.slice(2);
    if (key.startsWith('t:')) {
      if (v._del) { gone.add(id); continue; }
      const cur = tasks.get(id);
      if (cur) { for (const [f, x] of Object.entries(v)) if (!f.startsWith('_') && !TASK_FIXED.has(f)) (cur as any)[f] = clone(x); }
      else if (v._new) { const t = clone(v); delete t._new; t.id = id; plan.tasks.push(t as Task); tasks.set(id, t as Task); }
    } else if (key.startsWith('d:')) {
      if (v._del) { cut.add(id); continue; }
      const cur = links.get(id);
      if (cur) { for (const [f, x] of Object.entries(v)) if (!f.startsWith('_') && f !== 'id') (cur as any)[f] = clone(x); }
      else if (v._new) { const e = clone(v); delete e._new; e.id = id; plan.dependencies.push(e as Dependency); links.set(id, e as Dependency); }
    } else if (key.startsWith('p:')) {
      if (v._del) { lost.add(id); continue; }
      const cur = pkgs.get(id);
      if (cur) { for (const [f, x] of Object.entries(v)) if (!f.startsWith('_') && f !== 'id') (cur as any)[f] = clone(x); }
      else if (v._new) { const x = clone(v); delete x._new; x.id = id; plan.procurement.push(x as Procurement); pkgs.set(id, x as Procurement); }
    }
  }
  if (gone.size) plan.tasks = plan.tasks.filter(t => !gone.has(t.id));
  const alive = new Set(plan.tasks.map(t => t.id));
  // a package whose tasks are gone (or that was removed) is not part of the calculation
  plan.procurement = plan.procurement.filter(x => !lost.has(x.id) && [x.poTaskId, x.deliveryTaskId, x.installTaskId, x.satTaskId].every(id => alive.has(id)));
  plan.dependencies = plan.dependencies.filter(e => !cut.has(e.id) && alive.has(e.from) && alive.has(e.to));
  plan.tasks.sort((a, b) => a.order - b.order);
  return plan;
}

function fieldDiff<T extends object>(before: T, after: T): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const f of new Set([...Object.keys(before), ...Object.keys(after)])) if (!same((before as any)[f], (after as any)[f])) out[f] = (after as any)[f] ?? null;
  return Object.keys(out).length ? out : null;
}
/** The overrides that turn `base` into `plan` (only the plan-affecting keys: cfg, t:, d:, p:). */
export function diffPlans(base: Plan, plan: Plan): Overrides {
  const ov: Overrides = {};
  const cfg: Record<string, unknown> = {};
  if (plan.statusDate !== base.statusDate) cfg.statusDate = plan.statusDate;
  if (plan.powerRoute !== base.powerRoute) cfg.powerRoute = plan.powerRoute;
  if (Object.keys(cfg).length) ov.cfg = cfg;
  const bt = new Map(base.tasks.map(t => [t.id, t])), pt = new Map(plan.tasks.map(t => [t.id, t]));
  for (const t of plan.tasks) { const b = bt.get(t.id); if (!b) ov['t:' + t.id] = { ...clone(t), _new: true }; else { const d = fieldDiff(b, t); if (d) ov['t:' + t.id] = d; } }
  for (const b of base.tasks) if (!pt.has(b.id)) ov['t:' + b.id] = { _del: true };
  const bl = new Map(base.dependencies.map(e => [e.id, e])), pl = new Map(plan.dependencies.map(e => [e.id, e]));
  for (const e of plan.dependencies) { const b = bl.get(e.id); if (!b) ov['d:' + e.id] = { ...clone(e), _new: true }; else { const d = fieldDiff(b, e); if (d) ov['d:' + e.id] = d; } }
  for (const b of base.dependencies) if (!pl.has(b.id) && pt.has(b.from) && pt.has(b.to)) ov['d:' + b.id] = { _del: true };
  const bp = new Map(base.procurement.map(x => [x.id, x])), pp = new Set(plan.procurement.map(x => x.id));
  for (const x of plan.procurement) { const b = bp.get(x.id); if (!b) ov['p:' + x.id] = { ...clone(x), _new: true }; else { const d = fieldDiff(b as Procurement, x); if (d) ov['p:' + x.id] = d; } }
  for (const b of base.procurement) if (!pp.has(b.id) && [b.poTaskId, b.deliveryTaskId, b.installTaskId, b.satTaskId].every(id => pt.has(id))) ov['p:' + b.id] = { _del: true };
  return ov;
}
export const isPlanKey = (key: string) => key === 'cfg' || /^[tdp]:/.test(key);
/** Field changes (key -> new value, null = remove) that bring the stored overrides `current` to describe `plan`. */
export function overrideChanges(base: Plan, current: Overrides, plan: Plan): Record<string, any | null> {
  const next = diffPlans(base, plan), out: Record<string, any | null> = {};
  for (const key of new Set([...Object.keys(current).filter(isPlanKey), ...Object.keys(next)])) if (!same(current[key], next[key])) out[key] = next[key] ?? null;
  return out;
}
