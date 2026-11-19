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

## Second round (owner, 2026-11-19, after seeing the preview)

"The design differs in many places: take the attached screens apart, measure colours, sizes and proportions, and make it the same."

- The numbers in schedule/schedule.css and in SG / SN (schedule/ui/10-actions.js, 20-network.js) were measured on 4x to 8x renders of the design PDF (page 9 gantt and calendar, page 10 relation map). Do not round them or "tidy" them: outline 508 wide, header 40.75 (24.25 + 16.5), phase row 36.4 (30 when open), task row 33.25, bar 22 high with radius 4.5 in #f9f8f7, day 13.45 wide, text #5b5b5b 11.5 (outline) / #474747 12 (bars), summary bar 9.75 high #474747, relation lines 0.5 #afafaf and 0.75 #474747, today #1f8e00 / #e8f3e5; relation map cards 271 x 128.5, 89 apart, rows 33.5 apart, canvas #f9f8f7 with #eaeaea dots every 30 x 28.5. The design's 0.5 px hairlines (#848484) are written as 1 px #c1c1c1.
- Selecting (owner's words: "a click turns the action green and the lines to what is directly connected get stronger; a second click goes to the detail"). In the gantt and in the relation map the first click only selects (SCHU.sel); the second click on the selected task opens the panel (data-sch="pickrow"). Lists, the day list and tables still open on the first click.
- (Refined in the third round, see below.) Relation lines of the gantt follow the rule read from the design (schLinkPath): out of the earlier bar's lower edge 21.5 from its left end, down to the later task's row, round turn, into its left edge with an open arrow; if the later bar starts at or before that point the line hooks into its upper edge instead; a later task drawn above mirrors it. All relations of one task start at the same point; start points of different tasks that would coincide are set 5 apart. The relation kind (FS / SS / FF / SF) is not drawn differently; it is in the relation's menu.
- Relation map: columns by distance from the selected task (earlier to the left, later to the right), one trunk per earlier card 38 to its right, round turns, arrows at the later card's title line. Only relations between neighbouring columns are drawn; the rest is counted in the corner.
- The 프로젝트 도구 button is gone from the 액션 title (owner). The tools are an entry of the user menu (top right) while a project with a schedule is open: schUserMenu.
- (The meaning of the two numbers changed in the third round, see below.) Calendar badge: a speech bubble pointing at the day number; today's dark (#4f4f4f on #e6e6e6 hairline), every other day pale (#dfdfdf / #f4f4f4); today's also shows how many of its actions are new (green) and mention the member (red). A clicked day is not painted black any more; it gets a hairline frame.
- 30 % / 60 % / 90 % tags left of the gantt: the row after which that share of the whole schedule's weight (the weights of the progress rule) is done. This reading of the design was not confirmed by the owner in words; it was reported to them.

## Done in the second round

- Excel: export and import of .xlsx with the Schedule app's own code (schedule/core/files.ts, unchanged) and ExcelJS (MIT) in a bundle of its own, public/schedule-xlsx.js, fetched on demand (schXlsx). A workbook in the original 13-sheet form or an exported one can be imported. A plan from a file is matched to this project's tasks by id, or by WBS number when the ids differ (schRemapPlan), and becomes overrides of the bundled source plan; assignees, importance and addresses set here are kept. The gate / evidence sheets of an imported workbook are not taken over (the site keeps the bundled ones).
- Relations in the gantt: pull from the small circle at the start or end of a bar to another bar (end -> start FS, start -> start SS, end -> end FF, start -> end SF); click a line for its menu.
- "+" of the lower section adds a procurement package (overrides `p:<id>` with `_new`), a gate (`g:u:<id>`: title, the task it waits for, role, evidence, fallback) or an evidence record; 라이브러리 lists everything of the three tabs in the right panel (st-<project>-lib).
- Pictograms in front of 미팅 and 리서치 while the preview is on.

## Third round (owner, 2026-11-19, five points with pictures)

1. "Do not show all of today's actions; cut the list where the calendar ends." The list beside the calendar (`.rlist.sch`) gets its height from the calendar after every draw (schFitRight, called from afterNav through schAfterNav): its lower edge is the lower edge of `.cal .grid`. What does not fit is reached by scrolling inside the list; while there is more below, the edge is soft (class `cut`). The scroll position survives a redraw (SCH.rs), so a change from another member does not throw the list back to the top.
2. "Some relation lines of the graphs look awkward; look and redo them." Gantt (schLinkPath): still out of the earlier task's lower edge and, where there is room, round turn into the later task's left edge (room = 3 or more). Where there is none the line ends on the later task's upper edge: straight down wherever the two tasks stand over each other (the line may leave up to 7 beside the usual starting point for that; a milestone is left and entered on its slanted edge), otherwise one sideways step with round corners in the gap above the later task. There is no slanted piece any more and no hook right under the earlier task. A name stands inside its bar only when it fits or the bar is at least 110 long (the design shows cut names only in long bars); otherwise beside it, with a white edge so that a line passing behind stays readable. Relation map (schNetBuild): a line leaves the earlier card and reaches the later card at the same height, 24 below the top (SN.port, the design's title line), so cards of one row are joined by a straight line.
3. "Check and make the design one." One status design for the whole page, traced from the owner's sheet: 계획 (grey #939393, seven spokes), 확인 전 (amber #efad1b, !), 진행 (blue #1da3ed, open ring), 완료 (green #1acc00, check), 보류 (red #ea4949, pause; new), 조건부 미발동 (purple #b751ed, triangle). The colours are the sRGB values behind the sheet's Display-P3 screenshot. The marks are symbols `i-st-<kind>` whose numbers are the sheet's pixels; sizes are in em (sheet pixels / 91), so a mark is as tall as the word beside it; the word is 600. Everything goes through schMark / schStIcon: tasks, ordinary action items (the app's stIcon and the item panel's 상태 call schStIcon while the preview is on), and the states of gates, evidence records and supplier commitments, which are mapped onto the six marks in SCH_MARK_OF (확인 전 / 확인 필요 / 견적 수령 -> ask, 준비 중 / 미확약 -> plan, 검토 요청 / 확인 중 -> prog, 승인 / 반영 완료 / 확약 -> done, 보완·반려 / 보류 -> hold, 조건부 … -> cond). In the gantt outline the long word is shortened to 조건부 (its column is 56.7 wide; the whole word is the hint).
4. "Resting the pointer on a pale action count of the calendar opens such a window." The day window (schDayPopShow, `.sch-daypop`, a child of body scaled like #app): 505 wide, rows 48 apart, 44 above the first row and 53 below the last, title 17 / 600 starting 39 in, assignees (or the role in grey) after the title, D-day centred about 358 in, date 45.5 from the right; eight rows, then it scrolls. It opens 160 ms after the pointer comes to rest on the count of a day other than today, stays while the pointer is on it, closes 240 ms after the pointer leaves, on a click elsewhere, Esc, a scroll or a redraw; a row opens that action. Today's (dark) count has no window: the owner said "pale", and today's actions are the list beside the calendar. A click on a count still selects the day.
5. Notices. "Green on an action: the schedule of a new action item started today. Red: something changed on an action I am linked with, called in, or an assignee of. Order: red, green, then the nearest D-day."
   - green = the action's start is today (a task's forecast start, an action item's date) and it is not finished.
   - red = an action that concerns me differs from what I last saw. It concerns me when I am one of its assignees, when I am called in it (a comment by somebody else with @ and my first name, or a member mention of me in the body), or when it is linked with an action of mine (an action item whose task is mine; a task one of whose linked or referenced items is mine).
   - What I have seen is in my inbox record (meta:inbox:<사번>, a whole record as before): `seen` = {item id: short hash of the action's state}, `seenInit` = {project: 1}. The first time a member meets a project everything is taken as seen. An action that newly concerns me has no entry and is red. Opening it (the panel or the full page) is seeing it (schSeenOpen takes the mark away at once).
   - Whose change: schNoticeSettle is called before and after every merge of server data (sharedApply). A difference found while no server data came in between (SCH.tick unchanged) is this member's own doing and is taken as seen; a difference found right after a merge is somebody else's and is red. Do not compute "changed" anywhere else.
   - Nothing is compared while a scenario is being looked at.
   - Order (schDayRows, and the main table without a chosen order): red, green, not finished before finished, nearest deadline first (a late action is the nearest).
   - Today's list also carries the red actions that are not under way today, so a change on a task months away is not lost; today's count in the calendar is the length of that list, with the number of green and red ones beside it. The main page's action table carries them too.
   - The marks are `.sdot.r` / `.sdot.g` at the upper left corner of the title (the picture's place).

Readings of the owner's words that were reported to them and not yet confirmed: today's count has no window; what "linked" covers; red actions of other days joining today's list; "nearest D-day" meaning late ones first; which gate / evidence state gets which mark.

## Not done yet (say so when asked)

- Links between projects (portfolio): no second project has a schedule.
- Realtime co-editing of the schedule itself is field-level merging (last write wins inside one task); there is no lock on a task.
- Working calendars, resources, cost: out of the brief's first scope.
- Taking over the gate / evidence sheets of an imported workbook (see Excel above).
- A milestone has no circles to pull a relation from (it can be the target of one; its own relations are added in its panel).
