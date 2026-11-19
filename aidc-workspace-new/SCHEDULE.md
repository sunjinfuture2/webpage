# WorkSpace x Schedule

How the master schedule of a project is part of the WorkSpace project page. Written 2026-11-19 from the owner's brief
(design file 261118 and "AIDC WorkSpace x Schedule 통합 서비스 상세 설계서 v1.0") and the answers they gave that day.

## What the owner decided

| Question | Decision |
| --- | --- |
| How to roll out | Preview first: same site and data, the combined page only for a browser that opened `?v=2`. Switch the default when the owner has looked at it. |
| Existing action items of Pangyo | Kept. They are the group "일정 미연결 액션" under the list until somebody picks a task in 개발 단계. |
| Assignees (the source plan has roles, no names) | Show the executing role (R) in grey until a member is assigned. |
| Logo | Stays "AIDC WorkSpace". |
| Phase progress | Own rule: importance + milestone + duration (schedule/progress.ts). |
| 금일 액션 / the number beside a date | Tasks under way that day plus, from today on, late unfinished ones. |
| 업무 로드맵 | Gone from every project page in the combined version. The stored record is not touched. |
| Main page | Action table in the new form, with the Pangyo tasks that are under way or due within 30 days. |

Decided without asking (told to the owner): the schedule is shared and stored on the server; changes apply at once with
undo; 근거 및 확약 is one table over the six evidence sheets; the filter row the design copied onto the procurement
table is not used there; project links (portfolio) wait until a second project has a schedule; the power route stays 9,800 kW.

## Files

- `schedule/core/*.ts`: the Schedule app's core, unchanged (engine, commands, seed conversion, network layout). Do not edit.
- `schedule/overlay.ts`: source plan + overrides -> plan (`applyOverrides`), plan -> overrides (`diffPlans`, `overrideChanges`).
- `schedule/progress.ts`: the weighted progress rule and the default importance.
- `schedule/index.ts`: `window.AIDCSchedule`.
- `schedule/ui/*.js`: page code, concatenated in file-name order into one inline script after the app's own scripts. It shares the page's globals (S, ITEMS, $, esc, menuPop, datePick, ...). Every name starts with `sch` / `SCH`.
  - `00-state.js` preview switch, loading, the calculated model (`schModel`), `schCommit` / `schSet` / undo, formatters, the stand-in item of a task.
  - `10-actions.js` the 액션 section: tabs, filters, list, gantt (`schGanttBuild`).
  - `20-network.js` 관계도.
  - `30-panel.js` the block of a task in the item panel (정보 / 연결된 아이템), field editors, linking an action item to a task.
  - `40-sections.js`, `45-section-edits.js` 운영개시 예상, 외부설비 조달 · 승인게이트 · 근거 및 확약 and their panels (`schPanelHtml`, ids `sp-` / `sg-` / `se-` / `st-<project>-…`).
  - `50-calendar.js` action counts in the calendar and the day list. `55-main.js` the main page's action table.
  - `60-tools.js` 프로젝트 도구: backup (the Schedule app's JSON), CSV, scenarios, status date, driving path.
  - `90-events.js` clicks, typing, keys, dragging a bar, the preview badge.
- `schedule/schedule.css`: styles, built from the page's tokens.
- `public/schedule/pangyo.json`: the source plan (the Schedule app's `initial-schedule.json`, public by the owner's request of 2026-11-18).

## Hooks in the app (search for `sch` in original.html / shared-client.js)

`SCHED` (the live override records), `item()` and `adoptRow()` (stand-in items), `renderProject()` (sections, roadmap),
`renderCalendar()` / `rightList()`, `actionSecHtml()` and `renderMain()` (main page), `itemHtml()` (title number, props,
no trash button for a task), `saveItem()` (renaming a task from its panel), `openPanel()` (the non-item panels),
`render()` (`schMount`), and in shared-client.js `isFieldMeta` / `metaTarget` / `sharedRecords` / `applyRecord`,
`panelExists` and `cleanRoute` (`schDeferRoute`: an address naming a task opens after the plan has loaded).

## Not done yet (say so when asked)

- Excel (.xlsx) import and export: only JSON backup and CSV. The Schedule app's importer needs exceljs (about 1 MB) and replaces the source plan, which would have to be stored on the server.
- Links between projects (portfolio): no second project has a schedule.
- Drawing a relation by dragging between bars, and editing a relation by clicking its line: relations are added and edited in the task's 연결된 아이템 tab.
- Realtime co-editing of the schedule itself is field-level merging (last write wins inside one task); there is no lock on a task.
- Working calendars, resources, cost: out of the brief's first scope.
- Adding a procurement package or a gate.
