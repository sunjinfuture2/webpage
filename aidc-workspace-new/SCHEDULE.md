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
- The 프로젝트 도구 button is gone from the 액션 title (owner). The entry of the user menu that replaced it was removed with the my-page specification (DEL-02, 2026-11-19): nothing on the page opens the tools now; schToolsMenu(anchor, pid) and everything behind it are unchanged.
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

## Fourth round (owner, 2026-11-19, a list of about thirty points)

Project calendar
- A click on a day of a project's calendar does nothing any more (no selection, no frame; the list beside it is always today's). The hook is in the page's click handler and in renderCalendar (`sel` is today for a project while the preview is on). The main page's calendar still selects.
- The list's upper line is an element of its own (`.rline`), level with the calendar's line under the weekdays (schFitRight moves the list), and both lines of the list are the calendar's line: 1px #ededed, as wide as the text.

Lower section
- 승인게이트 is at most 596 high and scrolls. The line is black only where it leads into an approved gate and only as far as that gate's dot: each gate's `.ln` runs from its dot to the next one and is black when the next gate is approved (`to-ok`), `.ln0` is the piece above the first gate. Reaching a date paints nothing. The code (G1) is as large as the title and 700.
- The sentence above the procurement table was removed.

액션 일정 · 리스트 · 관계도
- One height for the three views: `--schh` (600) on `.sch-sec`; the gantt, the list (its header is sticky) and the relation map scroll inside it.
- Relation map: no + / − buttons; the fit pictogram stands at the upper left (a second press goes back to full size), Ctrl + wheel zooms; the dots are the background of `.sn-canvas`, so they scroll and scale with the drawing; the pointer on a card thickens the lines of that card (`g.hov`, the lines carry data-a / data-b).
- An importance worked out by the schedule is no longer paler. A status had no opacity; 계획 is the sheet's grey.
- Where nobody is assigned every view says 미지정 and nothing else (the role of the source plan is only in 일정 상세 of the panel).
- A column title of the list opens a menu: how to order by that column and what to keep (schColMenu; conditions in SCHU.cf, the assignee in SCHU.who, the phase in SCHU.phase; a green dot marks a title with a condition, 조건 지우기 clears them). The conditions apply to the list only.
- 일정 미연결 is a choice of the phase picker, after the last phase (SCHU.phase === 'none', list only). There is no separate group under the table any more: with 전체 단계 those actions follow the tasks in the same table. An action may also belong to a phase without a task (`phase` on the item): it is listed after that phase's tasks with the phase's number.
- D-day is 600 in the outline, the list, the main table and the panel (700 stays where the owner's pictures show it: the day list, the day window, the cards).
- A name of the list (and of the main table) starts where the column title starts; a milestone's mark hangs to its left.
- A relation is never stored by letting go any more. Pulling in the gantt, pulling a card of the relation map onto another, and every change from a relation's menu (kind, gap, in / out, delete) open schPropose (schedule/ui/35-propose.js): what is connected, the later task's forecast before and after, the operation date, a small chart of the tasks that move (dashed = before, green = after, the relation as a line) and their list; the kind can still be changed there; 확인 saves (schCommit, 되돌리기 as always), 취소 stores nothing. A relation that cannot be (a loop, a duplicate) shows the reason and cannot be confirmed. This is the one place where the owner asked for a confirming step; it does not bring back "save?" anywhere else.

Item panel (all types, only while the preview is on: html.sch-on, PREVIEW_ON in original.html)
- Menus of values that have a colour (status, importance, project) show their entries as they look in the page (menuPop entries may carry `html`).
- 사업명 is a plain tag without the pictogram; while editing a click on it lists the projects as tags and the x beside it takes the project off.
- While editing, what can be changed is paler and underlined; 저장 is a filled button, 수정 an outlined one.
- No assignee: 미지정.
- The trash is in the head of a task's panel too: it deletes the task after asking (the toast brings it back).
- The type is called 액션 instead of 액션아이템 everywhere (ACT in original.html; a browser without the preview still reads 액션아이템).

Task panel
- Nothing of a task can be changed before 수정. While editing a change still applies at once (the other views follow), tagged with the item's id (SCH.tag); 취소 takes back exactly those changes (schEditCancel), 저장 keeps them (schEditKeep from schAfterSave).
- Rows of 정보: 사업명, 예상 기한 (one row for the dates: it shows the forecast, what is typed is the managed date behind it; "선행 업무 반영" marks a forecast that differs), 실제 기한, 개발 단계 (the phase, changeable, also to a new phase made on the spot: records `ph:<code>` {label}; the task gets the next number of that phase), 마일스톤 (예 / 아니오), 참고 자료 (moved here; its picker starts with a search field) | 담당자, 상태, 중요도, URL. 진척률 is gone; 일정 상세 no longer has 추가지연, 잔여기간, 참조계획.
- The second tab is 연결된 액션 (its number as large as the word): only the chart of the tasks before and after, with more room above and below; no captions, no add buttons, no rows of linked actions.
- An ordinary action: 개발 단계 chooses a phase, then optionally a task of it; a new phase and a new task can be added from those menus.

Outside the preview
- The notes of a schedule task (items `wt-…`, `own`) are left out of the old page's lists (isLive): pressing 수정 on a task now creates that item, and a browser without the preview would otherwise list them as action items.

Readings that were reported to the owner: "names aligned with the title without a milestone" was done for the list and the main table (in the gantt outline the names already started at one place); "bar" for the gates was read as a scroll bar; the height "one screen shows" was set to 600.

## Fifth round (owner, 2026-11-19)

Main page (preview only)
- Partner list: the box before a name holds the site's logo (logoImg) over the first letter of the name; no pictogram.
- No "오늘" tag beside 금일 주요일정; no "n개 중 n개 표시" beside 프로젝트.
- A project can be deleted: the button stands at the right end of the row of 수정 (`.phead .pdel`), asks first and says that the project can be brought back. The project then leaves PROJECTS and waits whole in SETTINGS.projTrash (trashProject / restoreProject) for 30 days; it is listed in the trash of the settings (kind `project`) and purged with the other old trash. Its items, PHEAD entry and schedule record are not touched.
- Research has no project row in its panel.

액션 일정
- The percentage tags stand clear of the chart (they used to be cut by its edge).
- 운영개시 예상 · 운영개시 경로 · 상태일 stand in the upper left corner of the chart (`.sg-corner`), larger; the line below the chart with the counts is gone.
- The chart keeps its place over a redraw of the page (SCH.gs / SCH.ns hold the scroll position per view key): it used to jump back to today whenever the page was redrawn, e.g. after a change from another member, which looked like "moving while the pointer rests".
- The soft edge between table and chart is `.sg-left::after`, so it stays while the chart scrolls.
- Type of the outline 12.2 (was 11.5), D-day 500.
- Dashed is the reference plan (owner): a dashed line inside a bar = the task now runs longer than the reference plan, a dashed outline after a bar = it now ends earlier. The 참조계획 box (SCHU.refm, on by default) shows and hides these marks; the thin grey reference bars are gone.
- The horizontal scroll bar is a bar of its own above the chart (`.sg-topbar`, kept in step with the chart, which itself has overflow-x hidden; shift + wheel and sideways wheel still scroll). The edge between table and chart can be pulled (`.sg-split`, SCHU.gl, 340 to chart width - 280; double click = 508).
- Summary bars are rounded by 2 on all corners; a selected bar's frame is 0.75.
- The name of a task stands inside its bar, cut with … when short; only bars under 44 wide have it beside them (this takes back the third round's "beside when it does not fit").
- Filters show beside the section title as tags with an x (schChips / schLowChips, `data-sch="chip"`), the way the partner list shows its 구분; the list's 조건 지우기 button is gone.

승인게이트
- 76 between gates; the menus of gate / evidence / commitment states show the marks and colours (schStateMark).

## Sixth round (owner, 2026-11-20; frame, main page, project page)

All of it only while the preview is on (PREVIEW_ON / html.sch-on). New files: schedule/ui/65-shell.js (frame), 66-lists.js (lists).

Frame
- One logo: `.tb-logo` is always shown and the sidebar's own is hidden, so nothing travels when the sidebar folds. No grey behind
  `#sb-open` / `#sb-collapse`.
- Recent items are a tree (schRecentHtml): project › kind (미팅 / 액션 / 리서치, 자료실 › tab) › item, classes r0 / r1 / r2, a folded
  kind is r3; folded kinds are kept in localStorage `aidc-recoff`. Twelve entries instead of eight.
- The trash pictogram of a content panel is 24 in a box of 36 and is there on every panel, also while editing (itemHtml / shead).
- Notices (schNoticeDraw): `{id, date, at, title, body, text, by}`; `text` stays "title — body" for the page without the preview.
  The + shows while the bar is open and opens a form (title, text); a row opens its text; a notice by somebody else of the last
  14 days that this member has not opened carries a green mark (`nseen` in meta:inbox:<사번>); a click outside closes the bar.
- Footer (schFooter, called at the end of render): appended to the page's `.pw` after 120 of room; the last section's own bottom
  padding is set to 0 so the room is the same on the main page, a project page and 자료실.

Main page
- Action table: the project list's design (`.tbl.sch-list.sch-all`, columns 프로젝트 · WBS · 업무명 · 관리일정 · 중요도 · 상태 · 담당자 ·
  기한 · URL). Column titles open menus to order and filter (schMainColMenu; filters in S.mf, order in S.sort). Do not call a class
  `main`: `.main` is the page's main area.
- What is filtered shows as small grey tags (`.sch-chip`, darker under the pointer) in `.sch-chiprow`, between the title and the list:
  main actions, research, partner list (구분), and on a project page the action and the lower section (they used to stand beside
  라이브러리). `.sch-chipwrap` has no height; it is `display:flow-root` so that the margin below it does not collapse through it.
- Research: a row of pickers (schResBar: 프로젝트 on the main page, 기간, 작성자, 첨부, 정렬; state S.rf) and whole rows of cards
  (schResPer: two rows of as many columns as fit, so a folded sidebar leaves no gaps).
- Search boxes are the project page's grey box everywhere (searchBox).
- Partner rows: logo 18.6, the meeting tag 2 lower and it opens that meeting (it used to open the partner), a grey ground under
  links on hover.
- Project cards: 운영개시 예상 first (schCardOps: from the schedule, "미정" without one); type 12.5.
- The + beside 프로젝트 opens a window (schNewProject: 사업명, 약칭, 분류, 담당자, 부지).

Project page
- The list beside the calendar (schRightList): `.rlist.sch` is a frame with two fixed lines (`.rline`), `.rscroll` between them
  scrolls; the date stands above the upper line (`.rdate`); captions 주요일정 / 액션 (no "금일") are sticky, each with a pictogram in the
  same place (i-sch-cal is new), the count in a speech bubble. schFitRight sets the frame's height to the calendar's.
- The + of 외부설비 조달 · 승인게이트 · 근거 및 확약 stands above the open tab (schLowAddPlace); 라이브러리 stays.
- Meeting cards cut by the edge fade to white (`.meet .fade`).
- 사업개요: the three columns share the width a folded sidebar frees; a company that is in the partner list shows its small logo
  (schPartnerMark); in edit mode `@` in a company field lists the partners (schAtShow), Enter or a click takes one.
- The day window is drawn at 0.7 of its size.
- tests/schedule-6.cjs (49 checks).

## Seventh round (owner, 2026-11-20, second list of the day)

Preview only. New file: schedule/ui/68-feedback.js (what a change looks like, relation map handling).

Frame and main page
- Calendar pictograms take the project's colour (schCalPict; `--pc` on `.cal` for the counts of actions, pale on other days); research,
  which belongs to no project, is a light grey (#c6c6c6).
- The list beside the calendar has a soft upper edge once scrolled: a gradient below the caption that stands still (`.rcap.stuck`,
  set by schFitMark); the day window uses a mask (`cut-t`).
- Sidebar: only the open entry is dark; no counts beside the kinds of the recent tree. Breadcrumb: all but the last part at 50%.
- Footer: 240 above it, the line runs across the whole page, the logo is black, and a row of the company's places: 그룹웨어, 회사 홈페이지
  as words, YouTube / Instagram / Facebook as grey marks. Their addresses are `SETTINGS.links` (설정 › 워크스페이스 › 일반, owner /
  manager); one without an address is pale, says so, and leads an owner / manager to the settings. No address is built in: the
  company's real addresses could not be looked up from the build environment.
- Research: a picker for the tags written in front of titles ([REF], [ENERGY] …; schResTags, those used at least twice), no project
  picker; cards share the row (`minmax(210.3px,1fr)`), so the gap and the edges stay while the width follows the sidebar.
- Tags of filters: the word 1 lower; in the project's colour on a project page (`--pjc` on #page-project, set by schFooter) and for a
  project filter on the main page. The list tab and the main table have no pickers above them (their column titles do that).
- Taking the partner filter off no longer scrolls to the top. No "n개 중 n개 표시" beside 미팅.

Project page
- The + of the lower section is 40 above its tab. Gates that are not approved are at 50% except their state.
- Gantt: the horizontal scroll bar is below the chart again (`.sg-topbar` after the scroll box); the % tags are one SVG shape and are
  placed from the chart's own offset (they were off by the height of the bar that used to be above); the shade at the table's edge
  is black at 5% with multiply (white over dark bars made them lighter); the triangle of a phase row is no longer cut.
- A bar is moved by its middle and made longer or shorter by its ends (`.rz`; start: plannedStart and length, finish: plannedFinish).
  While pulled: a dashed outline where it stood (`.sg-ghost`), both dates above its ends (`.sg-dlab`), a tag with the days.
  SCH.drag holds back redraws of the page (sharedRedraw) for as long as something is pulled.
- After a change by pulling: schChangeCard, a card at the foot of the window (task, dates before → after, how many others moved,
  operation date, 되돌리기, the list of the others on demand). The bars that moved flash and keep their outline for 3.6 s; these marks
  are data (SCH.ghost) put back by every schGanttBuild, because the page is drawn again when the change has been saved.
- Pulling a relation: the circles stand 13 outside the bar's ends; the line is drawn by schLinkPath as soon as the pointer is on a
  bar; the half of the target under the pointer decides start / finish and is marked. The window (schPropose) shows the four kinds
  as small pictures (schRelGlyph) and the outcome in one line (`.pp-sum`).
- Relation map: pulling moves the view (cards too), the wheel changes the size around the pointer (schNetZoomAt), a relation is
  pulled from the circle at a card's right edge (`.sn-port`, schNetLink).
- Never use the class names `main`, `hd`, `ln` and the like bare inside new blocks: the page has global rules for them (the card
  was drawn wrongly twice because of `.main`).
- tests/schedule-7.cjs (35 checks; two fewer when there is an owner and the member cannot set the footer links).

## Eighth round (owner, 2026-11-20, third list of the day: about 45 points and two files)

Preview only unless said otherwise. Files: schedule/ui/32-fields.js (one panel for actions, the lines of a meeting), 52-holidays.js,
70-export.js (Word / PDF), 72-library.js (the wall), and additions to the others.

For everybody (data and plain bugs, not design):
- A download button only where a file is attached (`hasFiles` no longer counts the fixtures' `file` flag; meeting cards too).
- "n min before" beside a meeting is worked out from its date and time (meetPre), never stored words.
- The demo action items are gone: out of the fixtures, and once per existing database the untouched copies go to the trash
  (dropDemoActionsV1 behind META_FLAGS.demoActionsV1; one that was renamed, commented on or given a file stays).
- A project is listed once whatever the saved order says (orderedProjects); the sidebar search shows one line per page or item.
- A window that has nothing to hang on opens where the pointer last went down (LASTPT, anchorRect); askInput no longer follows
  the text selection.
- The share address carries everything that is open, a library included, plus `tab` / `view` / `sec` (shareHash, routeExtras).

Every project has the schedule sections:
- schHas(pid) is true for every project; one without a workbook starts from schEmptySource() (schLoad is immediate for it).
  The engine wants at least one task, so schCalc() hands out an empty result for an empty plan; `m.res.operationDate` may be ''.
- The outline of the gantt ends with a row that adds a phase (data-sch="newphase"); a phase a member made keeps the name the
  member gave it also once it has tasks (schModel reads `ph:<code>`).
- Research belongs to no project: every project page and every calendar shows all of it (freeResearch); its breadcrumb and its
  group in the recent tree carry no project.
- Projects are called by their full name everywhere (pname); the short name is neither shown nor asked for.

Panels:
- An ordinary action shows the block of a task (schActionProps): 정보 / 연결된 액션, the same rows and pickers. Its values are item
  fields (date, end, actualStart, actualFinish, phase, task, ms, refs, people, st + stx, pri, url). `st` stays 'prog' | 'done';
  `stx` names one of the other marks (schItemSt reads both). A new action made on the main page has no project.
- A meeting's three card lines are fields (일자 · 장소, 주요안건, 상대 참여자) with their pictograms; meetParts / meetWrite keep
  `checks` (what the cards read) and `time` / `place` / `agenda` / `extAtt` in step. Cards always show the three pictograms.
- The trail (S.trail): opening a panel from a link inside the open one adds that one; a step leads back. It stands between
  the type and the 수정 row (`.itrail`). A library is a step too.
- Export (`.iexp` beside ⋯): schExpModel(it) is written out as a .docx (schExpDocx: the parts of the file are put into a zip
  without compression by schZip, nothing is loaded) or as a page for the print window (schExpPrint; "PDF로 저장" there makes the
  PDF). The sheet follows the owner's sample: grey line top right, bold title, rule, orange numbered headings in a left column,
  grey-headed tables, logo and page numbers at the foot (public/export/sunjin-logo.png; in print through @page margin boxes).
  Never write a literal closing body tag in schedule/ui: the build puts the later scripts in front of the first one (it now
  refuses to build).

Schedule sections:
- Excel: a button at the right of the filters of 일정 · 리스트 · 관계도 · 외부설비 조달 · 승인게이트 · 근거 및 확약 (schXlBtn,
  schXlsxSection). One workbook with the sheet names of the original, filled from the page as it is now (what members changed
  and added included), opened on the section's sheet. AIDCScheduleXlsx.makeBook (schedule/xlsx.ts) writes it.
- Gantt: the points relations start from are a layer above the bars (`.sg-dots`); the shade at the table's edge is one strip over
  dates, rows and scroll bar (`.sg-shade`); the line being pulled follows schLinkPath towards the pointer; a relation can be
  taken hold of and pulled off (schLinkPull asks through schPropose); the ground can be pulled (schGanttPan).
- Relation map: lines have a hit area (click: menu, pull: take off); the card pressed before is marked (SCH.netPrev) and the
  pressed card stays where it was on the screen (SCH.netAnchor; the sheet grows as much as that needs).
- A change card stays until it is closed; the toast of a schedule change too (`keep`).

Frame and lists:
- Toasts with the preview stay at least 7 s, wait while the pointer rests on them, have an x and may carry a way there
  (`go`), e.g. 열기 after saving on the way out.
- Sidebar: the top block is sticky with a soft edge; name + arrow of a row are one link underlined as a whole (`.sb-lk`).
- Holidays: red dates and, since the owner's own change of 2026-11-23 (commit d7c453f, HOLIDAYS.md), their names beside
  them in the preview's calendars (schHolidayDate / schHolidayName; they were dates only before). schHolBuilt (fixed dates,
  the lunar ones of SCH_LUNAR, substitute days by rule, each with its name) plus what the Worker finds (/api/holidays through
  holiday-service.mjs: the official KASI service when the secret KASI_SERVICE_KEY is set, otherwise date.nager.at; kept for
  a day in table `holidays`; only the year is sent) plus SETTINGS.holidays (설정 › 워크스페이스 › 일반). The outside services
  cannot be reached from the build environment: the built-in part is covered by tests/schedule-8.cjs, the names and the
  Worker's reading by tests/holiday-labels.test.mjs (node --test, no server).
- Research: a period of one's own on a two-month calendar (schRangePick); no sort picker; a title never takes more than two
  lines below its tag.
- Project cards: pickers 분류 · 담당자 · 정렬 (schProjBar); a picture's height follows its shape between 150 and 부산's 296.2
  (`imgR`, measured at upload), without a picture 판교's 207.8.
- Library: a wall of cards made 36 at a time (schLibDraw / schLibMore, IntersectionObserver), pictures lazy.
- tests/schedule-8.cjs (three members; it makes a project from nothing and removes it again).

## Ninth round (owner, 2026-11-22, five points with pictures)

- Main action table: the project column is as wide as the longest project name needs (schPillW measures the tags, `--pjw`
  on the table; 106 to 230, beyond that the tag ends in …).
- Partner list: an address keeps to its column (…); the lines under address and class are straight (no rounded box).
- Sidebar: the agents' square stands further right; items under a kind are closer together and further left; a group has
  more room above it.
- A change made in a task's panel that moves the schedule (dates, actual dates, state, milestone, phase) shows the card of the
  gantt (schChangeCard through `editCard` in schFieldEdit) instead of a toast. The card stays while that project's task is open.
- Relation map: nobody assigned is an empty face (`.avatar.nil`), members show their own pictures.
- tests/schedule-8.cjs has these (77 checks now).

## Tenth round (owner, 2026-11-23, four points with pictures)

- Relation lines of the gantt join two tasks the way the relation map does: out of the END of the earlier task (its right
  edge, level with its middle) and into the START of the later one (its left edge); SS / FF / SF use the ends their kind
  names. The line keeps the chart's own rule (schLinkPath(a, b, type)): level and upright pieces, round turns (5 at most), an
  open arrowhead, a point where it starts. It leaves by a stub of 9, runs along one upright line and turns into the other
  task; when the other task's end lies behind that line it goes round along the gap between the rows. Tasks whose upright
  lines would fall on one another get stubs 4 longer each (`so` on the row). The old rule (from the lower edge, 21.5 from the
  left, `port`) is gone. The line pulled by hand and the small chart of the relation window draw the same thing.
- Partner list (preview): every row 42 high (more only when the classes need a second line), the row's line at its very
  bottom, every cell's content on one middle line (an underlined link is balanced by the same room above its text); the line
  under a class 3 higher; column titles, logo and chips start where the lines start.
- Main action table: the project tag's text sits in the middle of its box again (it had lost that when the tag became a
  block for the … in the ninth round).
- Project calendar: the notice beside today's count is a circle (11 x 11); "9+" gets smaller type (`.w`).
- An existing relation is changed the way a new one is made (schLinkPull, gantt and relation map): the line does not move
  (it stays, pale, class `pull`); the end that was taken hold of (the half of the line under the pointer) comes loose and a
  draft line from the task that stays follows the pointer, drawn by the rule of a new relation. On another task: the
  relation moves there (gantt: the bar's half says start or end, so the same task's other half changes the kind) -
  schPropose shows it first (연결 옮기기 / 관계 유형 변경); a move is stored as the old relation removed and a new one added.
  On empty ground away from where it was taken: the draft turns red (`cut`) and the window asks whether to remove it.
  The mousedown is cancelled (preventDefault): a text selection left on the page made the browser start its own drag and
  swallow the pointer's moves.
- Pulling the ground of the gantt writes the scroll position into SCH.gs at once (a redraw held back during the pull runs
  on letting go and used to put the chart back a few pixels, because the scroll event had not arrived yet).
- tests/schedule-8.cjs has these; tests/schedule-1.cjs checks the new starting point of a relation.

## Eleventh round (owner, 2026-11-23, a list of 23 points)

For everybody (faults):

- A draft is only its writer's. The old fixture flags (`table` / `card` / `cal`) keep a draft listed only when nobody wrote it
  (`legacyListed` needs `!authorId`); the Worker's `privateDraft` no longer looks at the flags. A recovered draft ("[복구 초안]")
  used to copy the flags of what it was recovered from and was sent to everybody; the copy drops them now.
- The global search of the sidebar also finds the tasks of the schedules (a task has an item only after somebody wrote in it).
- A project's scale is one value: the overview reads `scaleOf(h, i, p[SCALE_FB[i]])` like the card and writes both.
- Versions of something the server was never given (an archive row, a task nobody wrote in): `sharedVersions` answers [] on a
  404 and the window says there are none; another fault shows what the server said (`userMessage`).
- "Has a file" is what the body links to (`hasFiles` = `itemFiles(it).length`), and the library lists exactly those files
  (it used the server's list of uploads, which keeps a file that was taken out of its body).

With the preview on:

- Dates are written yyyy. mm. dd everywhere (`dateDot`; schD, fmtDateDot, fmtDateK, fmtStamp(Short), the editor's stamps through
  `ctx.dateText`). `dateShow(r)` is what a row shows: the stored `dateTxt` is in the old form and is used only without the preview.
  The gantt table is 540 wide by default (was 508) so that two full dates fit.
- Action lists: 시작일 and 완료일 are two columns without the arrow, "-" where there is no finish (a milestone, an action
  without an end). `fin` is a sort key of its own.
- Resting on "n일 지연" shows why (`[data-tip]`, 74-eleventh.js): what a member wrote as the reason (`why` on the task override or
  on the action item, a field of the panel while something is late) and what the schedule says (schLateWhy / schLateWhyItem).
- Pages: first / last ("<<", ">>") and the numbers ten at a time (pager of original.html, schPager).
- Search boxes show an X once something is typed (`qx()`).
- The member card (schUserCard): pressing an assignee (`[data-user]`) where the value is not being edited, or resting on it for
  a second. Name, title, role, team, e-mail, phone (`phone` is a new field of 마이페이지 › 프로필). The 사번 is not shown.
- Help: an "i" (`schInfo('dates' | 'status' | 'all')`) beside 예상 기한, 상태, the gantt's summary and the lists.
- Excel in the action section: "현재 시트 내보내기" (only what the search and the filters show: schXlsxSection(pid, tab,
  'view')) and "전체 내보내기" beside it (the owner's names; they were 현재 검색 결과 / 프로젝트 전체 내보내기 for a day).
- The project's delete pictogram is 35 (2.5 times); the closed notice bar's arrow points down; the main calendar's project tags
  wrap and never run into 미팅 · 리서치.
- Archive (76-archive.js; renderArchive hands over): search and the kinds of document at the top, 문서 목록 and 참고사이트 as
  two views. The table shows 중요도, a link pictogram beside a title that opens a site, and 드롭박스 URL (the item's `dbx`, or its
  address when that is a Dropbox one) as the last column; the detail has 드롭박스 URL as a field.
- Research: 구분 = `cats` on the item (chosen in the detail below URL, new ones can be typed) together with the [..] of the
  title; every one in use can be filtered by, several at once (`S.rf.tags`, schMultiPop). The 작성자 filter is 담당자 (people).
  Cards keep their text inside (clamped, equal height in a row).
- Library: previews of what a browser can show itself (PDF in an iframe, video, sound, the first lines of a text file); kinds
  by file format (이미지 · PDF · PPT · WORD · 한글 · 엑셀 · 기타). PowerPoint, Word, 한글 and Excel files cannot be shown
  without a converter and stay a sheet with the name of their format.
- Export: headings are read from the content (schExpHeads: a bold line, a line ending in a colon, a line with a heading mark, a
  short line above a list / table / long paragraph, [..]), never a sentence or a "name: value" line. One font: Pretendard for
  everything; the Word file carries a font table with one fallback (맑은 고딕) for a PC without Pretendard.
- Reference-site cards (owner's picture of 2026-11-23): five in a row, smaller (`.agrid.g5`: five equal columns of 267.6, cell
  138.8, name 18 / semi-bold, measured against the picture at its own scale); no line closes a full row; the + is the cell after
  the last card and, when it starts a row of its own, stands 46 below the cards.
- tests/schedule-9.cjs covers the round.

## Dark mode (owner, 2026-11-23)

- light | dark | system: a member's own setting (`prefs.theme` in meta:inbox:<사번>, so it follows them to every device) and
  this browser's copy of it (localStorage `aidc-theme`) for the time before the login has answered: a small script in the
  head (`<script data-early>`, the attribute keeps the build from taking it for the page's own code) sets `html.dark` before
  anything is painted. themeApply / themeSet / themeWant in original.html; only while the preview is on.
- Where it is turned on: a moon / sun in the top bar, between the 미리보기 badge and the member's profile (schThemeBtn,
  90-events.js; the owner asked for it exactly there, after first thinking of the profile menu) and 마이페이지 › 설정 › 기본 설정 › 테마.
- The dark look is not a second set of colours (the page has well over a thousand colours written out): `html.dark` draws
  the whole page through `invert(.93) hue-rotate(180deg)` - light becomes dark, hues stay - and what is a picture (img, video,
  iframe, canvas, .avatar.pic, .lb-tile) is filtered once more so that it looks as it is. A filter on the root element does
  not move fixed windows. Shadows become a hair line; the veils behind windows are written light so that they come out dark.
- A new element that shows a photo by a background picture has to be added to that list in schedule.css, or it will look
  like a negative in dark mode.
- Switching used to flip back and forth now and then: a whole state (/api/state: every 15 s, and after a socket message
  that came during a save) that was asked for before the switch arrived after it and was applied over it, and the next one
  put the setting right again. sharedRefresh now drops an answer when something was saved or arrived while it was on its way
  (`sharedSeq`) and asks again. A save also says which open page it comes from (`src` = `sharedPage`; the Worker hands it on
  with the broadcast, older pages send none) and a page skips its own save coming back over the socket: the answer to the
  request has brought it already, and applied late it could undo a second switch. When two windows of one member write the
  member's own record at once, the conflict keeps what each changed (prefs always).
- tests/schedule-9.cjs has the checks.

## Not done yet (say so when asked)

- Links between projects (portfolio): relations between tasks of different projects.
- Realtime co-editing of the schedule itself is field-level merging (last write wins inside one task); there is no lock on a task.
- Working calendars, resources, cost: out of the brief's first scope.
- Taking over the gate / evidence sheets of an imported workbook (see Excel above).
- A milestone has no circles to pull a relation from (it can be the target of one; its own relations are added in its panel).

## Twelfth round (owner, 2026-11-23)

Preview only. tests/schedule-10.cjs covers it.

- The list beside both calendars (schRightList): 주요일정 is meetings only (research is not listed there; it stays an entry of the
  calendar itself). Its caption carries the class `cap-ev`, not `ev`: `.rlist .ev` is an entry that opens something (hand, grey
  under the pointer), which made the caption look like something to press.
- No calendar selects days: the project calendar since the fourth round, the main calendar since this one. The list is always
  today's, `S.selDate` is not read while the preview is on, there is no "오늘로". "+N건" of a full day opens a small list of
  that day's meetings and research (schCalMore), each of which opens its panel.
- The reason of a delay is entered by 수정 and then a press on the "n일 지연" mark of 예상 기한 (schWhyMark wraps the mark while the
  panel is edited: `data-schp="f" data-k="why"` for a task, `data-pick="why"` for an ordinary action). The line 지연 사유 shows
  only once there is a reason; there is no empty line asking for one.
- Chips of items (chipOf): the pictogram takes the project's point colour (schCalPict; it was grey inside a coloured chip) and
  the title is always the whole title on one line, cut where the room ends, without dots (`text-overflow: clip`; the fixture
  field `short` is not used). The owner: "줄여쓰기는 쓰지마. 길어지면 차라리 잘리게". That is for chips of items (partner list
  and the like). The calendar's own entries end in "…" when they do not fit: they were cut the same way for a few hours and
  the owner wanted the dots back there. Titles in lists and tables keep their dots too.
- The line under a partner's 구분 is 1px (2 before). The archive ends with the partner list and nothing below it, so the footer
  stands 240 below as on the other pages (207 more before). The lines of the recent items that begin with a dot are 22 high (19).
- Later the same day: the count beside 액션 in a project's list is black and stands 1 lower in its bubble; research cards are
  as high as what they hold again (`.rgrid` is `align-items:start`: the eleventh round had stretched the cards of a row to the
  tallest, the owner wants the heights to show which card has a note or a file); the band around a line of the relation map
  that takes the pointer is `max(16, 11 / zoom)` wide (`--snz` on `.sn-zoom`; it was 12 times the zoom).
- The text of a calendar entry (`.cal .ev .lb`, top 1.67) and of a chip in the partner list's 미팅 column (`.mt .chip .t`, top 1)
  stands 1 lower than before; the pictogram beside it does not move.
- The lower section (외부설비 조달 · 승인게이트 · 근거 및 확약) has no 라이브러리 button any more (owner: not needed there).
- The archive has a fourth importance, `std` = "Standard", above 높음 (PRI_RANK -1), in violet #6d28d9 and bold: the owner wanted
  the colour that looks the most important without being red. priTxt and `.pri-std` are known to every page; the menu offers it
  for documents of the archive while the preview is on (archTabOf).
- For the gantt (found through a test that failed now and then): the chart and the scroll bar below it follow each other; a
  position one was just given by the other is not handed back (`_echo`). Handing it back a frame later, after the chart had
  been moved on, made the view jump back a step while it was pulled.

## Thirteenth round (owner, 2026-11-23): a change of dates is shown first

"액션일정에서 일자 바꾸면 어떻게 될지 연결 옮기기처럼 보여주고 적용하면 그때 가능하게 해. 상세에서 일정을 바꿔도 마찬가지야."

- schProposeDates(pid, o) in 35-propose.js is the sibling of schPropose: the same window (`.box.pp-dates`), for one task. It tries
  the change on a copy (validatedPlan + schCalc), says how the task itself moves, how many others move with it and what happens
  to the operation date, draws the small chart (before dashed, after solid) and lists every task that moves. 취소 changes
  nothing; 적용 saves through `o.commit` (schEditTask, so the toast carries 되돌리기 and Ctrl+Z works) and leaves the outlines of
  where the bars stood for a moment (schGhosts).
- It is opened by: a bar of the gantt moved by its middle or pulled by an end (schBarDrag: the bar is back where it stood until
  적용), and in a task's panel 시작일 / 완료일 of 예상 기한 and 실제 시작일 / 완료일 (schFieldEdit's `askDates`; the saved change is
  tagged with the edit as before, so 취소 of the edit takes it back).
- A change of state or of kind (마일스톤) is not a change of dates: it applies at once and shows the card (schChangeCard), as
  does moving a task to another phase. The card is no longer shown for dates.
- This replaces, for dates, the rule "a schedule change applies at once"; relations have been shown first since the fourth round.
- Tests: schedule-2 (window, 취소, 적용 from the gantt), schedule-7 (pulling an end), schedule-8 (the panel).

## My place in an item (owner, 2026-11-23: "노션처럼")

schedule/ui/78-mine.js, preview only. The red mark of an entry (hasMention -> mineRed) means: something in this item concerns
me and I have not seen it yet — a comment that calls me, a comment of somebody else on what is mine (I wrote it or am assigned),
my name in its text. These are exactly the unread notices of the inbox for that item (reminders apart), so the mark goes when the
item is opened from an entry or from the inbox (mineOpen marks them read). Before, the mark was only "a comment calls me" and
never went; the owner then asked for the two other cases, and a mark that never goes would have covered everything a member ever
wrote. Without the preview the old rule stands. Pressed, such an entry opens its panel where I am called first: the first unseen
comment that calls me, else my name in the text, else the first unseen comment on what is mine. A notice of the inbox opens at the comment it is about, or, for a notice about my name in a text, at that mention. The place is scrolled into view and lights up for
2.6 seconds (`.mine-hit`; kept as `SCH.mine` so that a redraw of the panel does not put it out). The page's handler of
`[data-open]` and the my page's `in-open` call mineOpen instead of openPanel. An entry without a red mark opens as before.
tests/schedule-10.cjs has both ways in.

## Small movements (owner, 2026-11-23, the fourteenth round)

"부담스럽지 않은 수준에서 UI 애니메이션". schedule/ui/80-motion.js and the block "small movements" at the end of schedule.css; preview
only. All short (0.12 – 0.26 s), no bounce, nothing while something is pulled. `html.mp-calm` (설정 › 화면 움직임 줄이기) and the system's
reduced-motion setting turn every one of them off (schCalm for the parts that wait in script).

- Why classes and not transitions: most of the page is drawn again as HTML, so there is nothing for a transition to run on. A
  movement is a class put on what was just drawn (`j-in`, `j-fade`, `j-tab`, `sg-j-in / -shift / -out`, `j-cal-n / -p`), set off by
  the press that caused the draw (one capturing click listener) and taken off again after 0.3 s. `translate` / `scale` are used
  instead of `transform`, so that what is already turned or scaled keeps its own transform.
- Gantt, a phase opens / closes (schFold, called by the `phase` handler): opening draws first, then the phase's rows and bars come
  in and everything below slides from where it stood (the distance is how far the next phase moved); closing lets the rows go
  first and draws 0.12 s later, so closing is that much slower than before. The arrow turns.
- After a change of dates is saved the bars slide from where they stood (schBarSlide, called by schGhostsDraw): it starts on the
  first draw that has the bars at their new places and goes on from where they were when the chart is drawn again meanwhile.
- Tabs (액션 views, the lower section, a panel's 정보 / 연결된 액션, the archive's views and kinds): the line under the chosen tab
  grows from the side of the tab that was left, what it shows fades in. For that the lines of `.sp-tabs` and `.ar-views` are
  drawn as a background (same place and thickness as the border they had).
- What appears: menus, the member card, the day window come down 5 px; a window that asks (relation, dates, delete) fades its
  veil in and grows from 97.5 %. Put on by an observer of the body's children; something drawn again within 0.09 s of going
  (a menu after a choice) does not move again.
- The calendar moves the way the month goes; the recent items of a kind and the notice list come in when opened; light <-> dark
  crosses over (`html.th-anim` for 0.34 s gives the page's filter and the turned-back pictures the same transition).
- Second set (the owner asked for it the same day): cards rise 2 under the pointer (project, research, reference site: styles
  only; the row of project cards got 3 of room above because its box cuts); the rows of a list fade in after another page, a
  filter tag taken away, or a choice in a menu opened from a column title / filter (schMotionList remembers which list; not
  while typing in a search box); a red or green mark that has just come pops once on every entry of its item, and the inbox's
  count pops when it grows. "Just come" is read from the data (dotsOf per item, at most three looks a second), never from the
  DOM, because entries are drawn again all the time; nothing pops on the first look or when a load of data arrives at once.
- tests/schedule-11.cjs.

## Excel upload (owner, 2026-11-23, the fifteenth round)

"수정 옆에 엑셀 업로드 버튼 … 정보 입력이랑 가이드용으로 줬던 그 엑셀파일을 기준으로 올리면 프로젝트 페이지에 자동으로 정보가 입력되게 …
각각 올릴 수도 있고 마스터파일 하나로 업로드할 수도 있게." schedule/ui/82-upload.js (the window, the merge), `readSheets` in
schedule/xlsx.ts (the reading, in the Excel bundle), the loading of an uploaded plan in schedule/ui/00-state.js. Preview only.

- The format is the owner's guide workbook ("판교 AIDC 개발 마스터스케줄", thirteen sheets; it is confidential and not in the
  repository). A file may hold all of its sheets or any of them. Which sheet fills what:
  단계별업무분장 -> 액션 일정 · 리스트 (tasks); 업무연결 -> 액션 관계도 (relations); 외부설비 조달대장 -> 외부설비 조달;
  승인게이트 -> 승인게이트; 보완·확약관리 · 전제와참고자료 · 책임경계 · NVIS일정검토 · 오프테이커 후보검토 · 원자료대조 -> 근거 및 확약;
  검토요약 (the row 기준일) -> the status date. 마스터스케줄 is read only when a file has no 단계별업무분장, and then only for
  names, dates, progress and assignees (its cells are formulas over the other sheet); 운영영향 분석 is a result and is not read.
- Reading (`AIDCScheduleXlsx.readSheets(file)`): unlike the Schedule app's importFile it does not want every sheet at fixed
  rows. A sheet is found by its name, its header row by its first cell within the first 15 rows, its columns by their titles; a
  package's cells are put back under the letters planFromSource reads. Whatever is wrong is a note of that sheet (a row, a
  missing column, the app's own export layout) and only that sheet is left out. Read against the real workbook the result is
  equal to the built-in plan of 판교 in every task, relation and record.
- Where it is kept: the merged source plan (schUpSlim: the SeedArchive without the cell copies of tasks) is one file on the
  server (`POST /api/file`, item `sched-src-<project>`, JSON as gzip, about 64 KB for the 233 tasks of 판교) and the project's
  record names it: `src: {id, name, at, by, parts, n}` in meta:sched:<project>. schReady compares the plan in memory with the
  name in the record (`schSrcWant` / `SCH.srcId`), so an upload by somebody else, or its undo, makes the page fetch the other
  plan (`schSrcFetch`, cleaned by `schSrcClean`; plans this page has had are kept in `SCH.arch`). A project without `src` has the
  built-in plan (판교) or an empty one, as before. The Worker only learned to remove these files when a deleted project is
  purged; MIN_CLIENT stays 4.
- Merging (schUpMerge): a section that was uploaded is replaced by the workbook's, the others stay. A task keeps its id by
  WBS (so its body, comments, files, linked actions stay), a new one gets `<project>:task:<WBS>`; a relation whose task is not
  there is left out and told; a column the sheet does not have keeps the value the plan had.
- What members changed in the app (schUpReconcile, a three-way merge per value): overrides sit on top of the source plan, so
  they stay; where the workbook changed the same value since the plan before, the workbook's value wins and the window says how
  many such values there are before 적용. A task / relation / package added in the app that the workbook does not have stays;
  what hung on something that is gone is dropped. So the same workbook twice changes nothing ("바뀌는 것이 없습니다").
- The window (after the owner's reference picture, in the page's black, white and grey): a centred title, one grey line, a
  large dashed rounded field with a folder (drop or press; several files); with files in it the field becomes a low strip, each
  file lists the sections found with their counts and its notes, and "프로젝트에 반영되는 내용" says per section how many are new /
  changed / gone, what was not uploaded, and what happens to the operation date. Nothing is written before 적용; the plan is
  worked out again on what is there at that moment. One undo step (toast, Ctrl+Z) takes the plan and the changed overrides back.
- Not done: a file in the app's own export layout (현재 시트 내보내기 / 전체 내보내기) cannot be uploaded: its tables have other
  columns. It is recognised and refused in plain words. Old stored plans are kept (an undo needs them); nothing removes them
  but the purge of a deleted project.
- tests/schedule-12.cjs (41 checks; the workbooks are made in the browser in the guide's shape).

## WBS and 개발 단계 are one thing; asking before leaving (owner, 2026-11-23, the sixteenth round)

Four requests of one afternoon. Preview only, except the fix of the address.

- **A phase can be renamed and removed** ("만든 거 수정도 할 수 있어야지"). schPhaseRename / schPhaseDelete / schPhaseEditItems in
  30-panel.js. The name of any phase is the record `ph:<code>` (schModel already read it); a phase of the workbook that was renamed
  can have its own name back (the record is removed). Removing is offered only while the phase holds no task. Where: the "⋮" of a
  phase row in the gantt (`data-sch="phmenu"`, shown with the +) and, for the phase that is chosen, the phase pickers of a panel.
  Actions that stood in a removed phase keep its code and read "일정 미연결"; therefore schNewPhase never takes a number an action
  still carries (and undo brings everything back).
- **An action with a phase is a WBS entry** ("WBS랑 개발단계가 같은 말인데 서로 잘 안 엮이니까", "다른 데에서 만들어도 액션 일정에 바로
  뜰 수 있게"). schActionToTask (30-panel.js), called from schAfterSave, which the 게시 handler now calls too: an ordinary action
  that has a phase, is published and is not hung under another task becomes a task of the plan: the next WBS number of its phase
  (schNextWbs), its dates, state, assignees, importance, address and reason go over, its references become `c:<task>`. So it
  stands in 액션 일정 · 리스트 · 관계도 like every task, can be moved and related. While it is written the phase row shows the number
  it will get (`.wbno.auto`); the second picker reads "업무 아래에 붙이기" (an action hung under a task stays that task's action;
  one without a phase stays 일정 미연결; a draft is not turned).
  - The item stays what it was: same id, so its body, comments, files and every link to it are untouched. It becomes the task's
    own item (`own` + `task`). The pair task <-> item used to be the id alone ("wt-<task id>"); it is now also read from the item:
    schItemId / schTaskIdOf go through schOwnIds (a map of the items that are `own` with an id of their own). Never build
    "wt-" + id by hand.
  - Undo takes the task away; schConvSettle (called by schStep) then makes the action an ordinary one again, and redo the task's
    item again (remembered for the session in SCH.conv). Deleting the task from its panel is the delete of a task, as before.
  - This replaces the fourth round's "an action may belong to a phase without a task" for what is published from now on; such
    actions made before stay as they are until they are saved again.
- **The list is grouped by phase** when it is in WBS order: one line (`.gr`) names the phase above its rows with how many it
  holds, "일정 미연결" for the rest: the outline of the gantt.
- **Leaving asks first** ("작성 중인 컨텐츠 창을 닫거나 다른 위치로 이동할 때, 저장 안 하고 닫을 거냐고 팝업"). This takes back, for the
  preview, the owner's rule of 2026-11-18. guardLeave hands over to guardLeaveAsk while PREVIEW_ON: a window (`#dlg.leave-dlg`)
  with 계속 작성 / 저장 안 함 / 저장 (초안으로 저장 for a new item). 저장 does what the silent leave did; 저장 안 함 drops a new
  item (`_dropped`, taken away by dropEmptyNew) and puts an existing one, a project overview or a card back; Esc or a press beside
  the window stays. Nothing changed: nothing is asked. Without the preview the leave still saves silently (tests/leave-1.cjs).
- **A menu's own button pressed again closes it** ("필터 … 또 눌렀을 때 접히게"): openPop remembers its anchor; the press that
  closes the menu (popOut) notes when it fell on the anchor, and the click that follows is swallowed in the capture phase of the
  window, before any handler can open the menu anew. Not for anchors one types into.
- From the audit of what cannot be changed or removed (the owner asked for the list): the title of a record a member added to
  근거 및 확약 (`u:title`), and "올린 엑셀 빼기" in the upload window (schUpTakeOut: `src` removed, one undo step). The rest of the
  list was reported, not built.
- For everybody: a task named in the address stays in the address while its schedule loads (routeWant in shared-client.js). The
  address used to lose it for that moment, and a reload in that moment lost it for good.
- Without the preview the item of a task is hidden (isLive); an action that became a task keeps its own id and stays listed there as
  the action it was (its fields are those of the moment it became a task).
- tests/schedule-13.cjs (51 checks); tests/schedule-4.cjs follows the new rule.

## The upload window with rows; what could not be changed (owner, 2026-11-23, the seventeenth round)

- **The upload window** (the owner's sketch): one large field for the master workbook and, below a line, six long rows that
  each take a file for one section: 액션 일정 (the gantt sheet 마스터스케줄, else the schedule columns of 단계별업무분장), 액션 리스트
  (단계별업무분장), 액션 관계도 (업무연결), 외부설비 조달, 승인게이트, 근거 및 확약 (its six sheets). `SCHUP.slots` holds one file per
  field; schUpView cuts what a row uses out of what was read (a file without the row's sheet is told so); what a row holds wins
  over the same section of the master file (said in grey). The row 액션 일정 alone brings dates into the tasks there are; beside
  a task list its dates go over that list's. readSheets takes `{tasks:'gantt'}` to prefer the gantt sheet.
  A cell that is merged into another one is read as empty: the guide's gantt sheet merges five rows per task, which read as the
  same WBS five times (found with the real workbook; ExcelJS hands the master's value to every cell of a merge).
- **A notice can be edited** by its writer or an admin: 수정 beside the × opens the form with what the notice says; saving keeps
  the same notice (`editedAt` / `editedBy`). 65-shell.js.
- **The image of a project card can be taken away**: with an image the button offers 이미지 교체 / 이미지 빼기 (undo in the toast).
- **A section of the 자료실 goes to the trash** instead of being deleted for good (for everybody): archSectionTrash marks it `gone`
  and sends its cards to the trash with it (`withSec`); a gone section is not drawn; restoring one of its cards brings it back;
  the Worker drops it once its cards have been purged. An empty section is still removed at once.
- **A category renamed everywhere at once**: a research 구분 from the list of 구분 (its picker in a note, the filter of the main
  page: "이름 바꾸기" on a row; schCatRename changes the notes' lists and the [..] of their titles, leaves out a note somebody else
  is editing) and a partner 구분 from the editor's list (✎; partnerCategoryRename). Both with 되돌리기.
- Still open from that audit: templates cannot be renamed, a link card cannot be moved to another section, a member's 사번 / name
  cannot be corrected by an admin and members cannot be removed, files taken out of a body stay on the server, recent items
  cannot be removed one by one.
- tests/schedule-14.cjs (23 checks); the window is in tests/schedule-12.cjs (43).

## One action panel, an x on every phase, the chart in the middle; the partner list stays (owner, 2026-11-24, the eighteenth round)

- **One panel for an action, wherever it is opened** (액션 일정 · 리스트 · 관계도): an ordinary action shows what a task shows.
  While it is edited the row 개발 단계 is `schStageEdit`: one picker ("단계 선택"), beside it the WBS number the action gets
  when it is saved (`.wbno.auto`) and an x that takes the phase off again. "일정 상세" opens 완료 기준 · 조건·확약 · 증빙
  for it too; they are fields of the item (`criteria`, `conditions`, `evidence`) and go into the task when the action
  becomes one (schActionToTask).
  "업무 아래에 붙이기" is gone: a new action cannot be hung under a task any more. One that hangs there from before shows that
  task (`a.wbno.up`, opens it) and can be taken off (`unlink`); it stays list-only as before.
- **An x on every phase**: the phase picker of an action and of a task is `schPhasePick` (menu `.pop.sch-phpick`): each row
  carries an x (`.phx[data-phx]`), the "⋮" of a phase row in the gantt has 단계 삭제 (`withDel`). schPhaseDelete asks first
  and says how many actions go with the phase: its tasks and their relations are removed with it (AIDCSchedule.removeTasks),
  ordinary actions that only named the phase stay as 일정 미연결. Everything is one undo step (`schUndoJoin` joins the
  steps made since a mark into one raw step). Not while a scenario is shown.
- **An action that was given a phase before the sixteenth round** (published, a phase, no task) gets its WBS number by
  itself: `schLegacyToTasks(pid)`, once per project and session, 0.7 s after the schedule section was drawn, only on the page
  of its writer (so two pages never turn the same action), all in one undo step with a toast. An action that was taken back
  on purpose (undo of the step) carries `wbsOff` and is not turned again by itself.
- **연결된 액션 stands in the middle**: schLinksHtml gives room only to the sides that hold something and centres what is
  drawn (with followers only, the task used to stand in the middle and its followers at the right edge); the chart is as
  wide as the panel allows (`--panelw` − 236, at most 898).
- **The partner list stays where it is** (for everybody; original.html `ptKeep`): choosing a 구분 pulled the title of the
  list to the top of the screen (an unconditional scrollIntoView), and because the list is the last thing on its page a
  shorter list let the page slide to another place. A 구분 chosen or taken off, a search and a page of the list now go
  through ptKeep: the scroll offset is kept, the list's box keeps as much room as the page lacks to stay there
  (`S.ptHold`, a min-height, worked out again with every such change, dropped on another page), and the screen moves only
  when the head of the list is above it. Never bring a scrollIntoView back there.
- tests: schedule-13 (57 checks: the picker's x, a phase with its task and one 되돌리기, the legacy action, the chart in the
  middle), schedule-2 (31), schedule-14 (30: the partner list with and without the preview).

## The number an action shows; the list beside the calendar; one gap for the research cards (owner, 2026-11-24, the nineteenth round)

- **A number can be chosen, the ones after it move up.** A task has two numbers now:
  - `wbs` is its **key** and never changes: the calculation (W8.6 is the operation start), the gates' and the procurement
    sheet's "연결 WBS", texts that name a task and the workbook (upload matches by it) all know a task by it.
  - `no` (optional, a field of the task like any other, stored in its `t:` override) is the number it **shows** within its
    phase when that differs from the key. `schNoOf(t)` reads it, `schNo(t)` writes it as 1-5, `schWk(t)` as W1.5 (the Excel
    sheets of the page). **Everything that shows a task's number goes through schNo**; `schWbs(t.wbs)` is only for a key
    that is no task (a phase code, a number that is not given yet). schWbsLinks shows the number the named task has now.
  - `schPutBefore(d, x, beforeId, pull)` puts a task before another one of its phase: it takes that one's number, that one
    and those after it move one up (as far as the numbers run on without a gap) and it gets an `order` between its
    neighbours (orders may be fractions), so gantt, list and relation map list it there. `pull`: it had a place in the phase
    already and what stood after it closes up first. No `beforeId`: the end of the phase.
  - A new action: the green number beside 개발 단계 is a button (`data-schp="wbs-at"`); its menu (`schNoPick`,
    `.pop.sch-nopick`) lists the actions of the phase with their numbers and "맨 뒤". The choice is `wbsAt` on the item (the
    id of the task it goes before; dropped when the phase changes) and is used when the action becomes a task
    (schActionToTask), in the same undo step.
  - A task that is there already: while its panel is edited its number is the same button (`wbs-move`); a move is tagged
    like every change of an edit, so 취소 takes it back.
  - A task moved to another phase gets the last shown number there (schMoveToPhase).
  - Known limits: two members who put something in between at the same moment can give two tasks the same number; a workbook
    uploaded later is matched by key, so its numbers show moved where something was put in between.
- **The list beside the calendar**: the date above it stands at the left end of the line (still yyyy. mm. dd, both pages);
  in a row the assignee is 3 px nearer to the title and the date is written `yy. mm. dd` on one line (`schD2`, used only
  there: the window of a day and everything else keep the whole date).
- **Research cards**: the gap between columns and between rows is 15 px both (it was 15.2 / 15.3, which fell on 15 or 16 px
  from card to card); schResPer counts with the same 15.
- tests: schedule-13 (66 checks: the picker of a place, the numbers after it, the gantt, one 되돌리기, a move and 취소),
  schedule-14 (33: the list's date and rows, the two gaps), schedule-7 (the gap is 15).

## The combined page is the page (owner, 2026-11-24)

- The owner opened the plain address on another computer, saw the old page and asked for the combined screens without the
  switch. Since then a browser gets the combined page unless it asked for the old one: `?v=1` stores `aidc-preview` = `0`
  (that browser keeps the old page), `?v=2` stores `1` again, no value means on. A browser that had turned the preview off
  through the old badge has no value and therefore gets the combined page too.
- The rule lives in three places that must agree: `schPreview()` (schedule/ui/00-state.js), `PREVIEW_ON` (original.html) and
  the guard against a dark flash in the head of original.html. Where localStorage cannot be read the page is the combined one.
- The orange "미리보기" badge (with "기존 화면으로 돌아가기" and "미리보기 주소 복사") is gone; the moon / sun stands before the
  profile.
- Tests: tests/h.cjs opens `?v=1` when a suite names no address, so the editor, leave and panel suites keep testing the page
  they were written for; the schedule suites pass `?v=2` as before. tests/schedule-2.cjs checks the rule itself (a fresh
  browser at the plain address, `?v=1` remembered, `?v=2` back) — 33 checks.

## Pulling an action to its place; the archive's column menus; dates of a pair (owner, 2026-11-24, the twentieth round)

- **The place menu is pulled** (`schNoPick` / `schNoDrag`, 30-panel.js): the action itself is a row of the menu (green, a
  grip at its left) at the place it has — a task that is being moved — or will get — a new action, by its title. Pulled with
  the pointer it follows it, the rows it passes slide out of its way (a CSS transition on their transform; nothing is
  redrawn while it is pulled) and every row shows the number it would get; let go, it settles and `pick(beforeId)` runs as
  for a press on a row (the menu closes). A pull of less than 4 px is a press and does nothing; the menu scrolls near its
  edges. "맨 뒤로 보내기" shows only when the action is not last. menuPop rows may carry a class of their own (`cls`).
  Off under html.mp-calm (no transition).
- **The archive** (76-archive.js): twice the room between 문서 목록 · 참고사이트 and what stands below them (`.ar-top`
  116). The document table's column titles are menus like those of the other tables (`data-arcol`; `SCH_ARCH.col` /
  `SCH_ARCH.sort`, this browser's own, not stored): 제목 (order), 담당자 (order, a member, 미지정), 기한 (order; 지난 기한 /
  이번 달 / 30일 안 / 기한 없음), 중요도 (order, a value), 최종수정일자 (order), 드롭박스 URL (있음 / 없음). What is chosen
  shows as tags above the table (`.ar-chips`, with "shown / all"), holds for every kind of document and for a search.
  A site card writes its description on one run (`oneLine`; the description keeps its line breaks, the panel shows them).
- **The finish of a pair of dates** (`schDto(a, b)`): its year is written only when it is another one than the start's —
  2026. 11. 03 → 11. 20, 2026. 12. 18 → 2027. 01. 08. Used by schRange (gantt table, relation map cards, the procurement
  sheet), the two date pairs of a panel (task and ordinary action, read and edit), the change card, the period picker and
  its tag. A date that stands alone (a column, a milestone) stays whole.
- The page is darkened by one filter (html.dark): never write a `html.dark` colour rule for a new part.
- tests: schedule-13 (70: the menu's own row, a pull with the mouse, a press, 취소), schedule-14 (39: the archive's menus,
  tags and room, a card on one run, the pair of dates).

## Meetings and projects as a table too (owner, 2026-11-24, the twenty-first round)

- schedule/ui/84-tables.js. The meetings of a project and the projects of the main page keep their cards and can be seen as a
  table in the design of the 외부설비 조달 table (`.tbl.sch-proc.sch-vtbl` + `vt-meet` / `vt-proj`: the grey head, rows 62
  high, ten to a page). At the right of the title stand the two views (`.sch-vt`, `data-vt="meet:table"` …) and a search box
  (`S.q.meeting` / `S.q.proj`); which view a member looks at is this browser's own (localStorage `aidc-view`).
- **Meetings**: pickers 기간 (예정된 미팅 / 지난 미팅 / 이번 달), 참석자, 정렬 (`S.mtf`, `data-mtpick`); `schMeetRows(pid)`
  is the one list both views draw (meetingCards takes it as its second argument). Columns: 날짜 · 시간 · 미팅명 · 장소 · 안건 ·
  참석자 · 외부 참석 · 회의록.
- **Projects**: the search is part of `schProjFilter` (name, status, owner, site, cost); the pickers of the section hold
  for both views. Columns: No. · 프로젝트 · 분류 · 운영개시 예상 · 담당자 · 부지 · 총사업비 · 공사 면적 · 총 수전용량 · IT 용량 ·
  서버. "엑셀로 내보내기" (`data-pjxl`, schProjXlsx) writes what the list holds now to one sheet, with a second sheet that
  says which search and conditions were on.
- While somebody types only the cards or the table are drawn again (`schMeetRedraw` / `schProjRedraw`), never the search
  box. The pages of these tables are their own (`data-vpg`, S.mtPage / S.pjPage): the page's handler of `data-pg` would take
  them for the member list.
- renderMain / renderProject choose between their own markup of the cards and `schProjTableSection()` /
  `schMeetTableSection(pid)`. The `?v=1` page has none of it.
- tests/schedule-15.cjs (19 checks).

## The page on a phone (owner, 2026-11-24, the twenty-second round)

- Until now a phone got the 1920 wide page shrunk to its screen (the viewport tag said `width=1920`). Now the early script in
  the head of original.html sets `html.mob` and turns the viewport tag to `width=device-width,initial-scale=1,minimum-scale=1`
  when the shorter side of the screen is under 700 px or the window is under 700 px wide — only on the combined page; the
  `?v=1` page and tablets keep the 1920 wide page. schedule/ui/86-mobile.js repeats the rule when the window changes size
  (schMobApply: the class, the tag, a redraw). `minimum-scale=1` matters: without it the phone widens its viewport to what
  is widest on the page.
- **Nothing is scaled** (fitLayout's phone branch): the page is as wide as the screen, `--L` is 16 px, `--d` is what is left
  of the 1338 wide column (about -980), so every rule of the form "1338 + d" fits by itself. A block that cannot be narrow
  sets a measure of its own in its own scope and is moved sideways: `html.mob .tbl{--d:-110px; overflow-x:auto}` with rows
  that are `max-content` wide. Custom properties that are worked out at `#app` (`--pw`) are not changed by that.
- schedule/mobile.css holds every rule (the build puts it last in the head, `#mob-style`): the top bar with the grey square
  that opens the sidebar as a drawer (the page's own `sb-off` state; a tap beside it or on an entry closes it), sections
  with their tools below the title, the calendar with seven days of one width (renderCalendar's COLW) and the list of the
  day below it (schFitRight does nothing there), rows of cards moved with the finger (no arrows, the carousel's offset is
  overridden), the overview of a project and the panel of an item one part below the other (the panel's parts are taken out
  of their absolute places: the order in the document is the order on the screen), the gantt with the names in 44 % of the
  width (SG.left), the archive, my page as a full screen with its menu as a strip, windows that fit.
- Fields are written at 16 px on a phone: a smaller field makes the phone zoom into the page when it is tapped.
- Not done: pulling bars and relations in the gantt and the relation map with a finger (they listen to the mouse; the
  place menu of an action, which uses pointer events, works), a layout of its own for tablets, the `?v=1` page.
- The page is still darkened by one filter in dark mode: no colour rules of its own were needed.
- tests/mobile-1.cjs (19 checks: a phone, a narrow window, a wide screen, `?v=1` on a phone). tests/h.cjs takes
  `viewport`, `isMobile` and `hasTouch` for a member.

## Column menus of the two new tables; cards and table start at one place (owner, 2026-11-24, the twenty-third round)

- The column titles of the meeting table and of the project table are menus (`data-vcol="meet:date"` …, schVColMenu in
  84-tables.js), like the other tables. Meetings: 날짜 (order, period), 미팅명 (order), 참석자, 외부 참석 (있음 / 없음), 회의록
  (있음 / 없음); they change the same conditions as the pickers beside the title (`S.mtf`), and what only the head can choose
  (`file`, `guest`) shows as a tag beside the pickers (`data-mtchip`). Projects: 프로젝트 and 운영개시 예상 (order), 분류, 담당자 —
  the section's own menus (schProjMenu), so the tags of the section show them.
- The table stands exactly where the row of cards stands: 1.1 in from the left of 미팅 (as wide as the row of cards) and
  120 below the top of 프로젝트. It stood 16.6 / 4 lower.
- The room between the title 미팅 and what stands below it was doubled the same day (19.3 -> 38.6): the cards and the table
  both start 76.7 below the top of the section (renderProject sets the row's `top` and the section's height 371.4 for the
  combined page; the `?v=1` page keeps 57.4 / 352.1), the soft edges and the arrows moved down with them.
- tests/schedule-15.cjs (25 checks).

## The place menu asks before it moves (owner, 2026-11-24)

- A row pressed or the own row pulled and let go in the place menu of an action (schNoPick) no longer takes the place at
  once: a window says from which number to which ("…1-6 자리에서 1-2 자리로 옮길까요?", for a new action "…1-17 대신 1-3 자리에
  넣을까요?") with 옮기기 / 취소. 취소 changes nothing; the same place as before asks nothing.
- tests/schedule-13.cjs (74 checks).

## The development review list (owner, 2026-11-24, twenty-fourth round)

The owner sent the company's "AIDC 프로젝트 개발검토 리스트" (a list of 18 projects on two pages, then one sheet per project) and
asked for the project overview and the project list of the main page to follow it. schedule/ui/88-report.js; tests/schedule-16.cjs.

- **추진 단계 took the place of 분류.** PSTATUS (original.html) is now 기초검토 · 사업구상 · 사업제안 · 사업계획 · 계통협의 · 인허가, in the
  order a project goes through them; it is still the project's `status`, for both pages. A status that is none of these (a
  project from before) is shown as it is, in grey. The demo projects of a new database carry stages; the old one-time routine
  that set the words of before does nothing any more, and a database from before gives its demo projects (pangyo, busan,
  incheon, sunlight) their stage and group once (meta:flags `stagesV1`).
- **The overview record (PHEAD[id], headOf) holds the sheet**: `sub` (부제), `grp` (AIDC / Small AIDC), `focus` (집중 추진),
  `first` / `asof` (최초자료일 / 기준일, plain text such as "2026.11.12 수신"), the cells of the list `lsite` `ldev` `larea` `lgfa` `lload`
  `memo`, `kpi` and `fin` (arrays of [value, what it is]) with `finNote`, the texts `main` (사업 개요), `infra`, `struct` (사업 구조
  및 수익 모델), `stat`, `risk`, `src` (a list is one line per item), `rows` (the table 사업 개요: [label, value]) and `plan` (추진 일정:
  [when, what, 완료 | 진행 | 예정 | 목표]). A project from before gets its `rows` from what its overview already said.
- **What other screens still read follows the sheet** (schRepMirror, on saving and on taking a file in): `loc` (map, search) from
  the row 위치, `zone` from 용도지역, `dev` from 사업주체, `cost` from the 사업성 지표 that is called 총사업비 / 총 투자비 / 총 CAPEX. The page as it
  was (?v=1) keeps its own overview and shows these.
- **The overview on the combined page** (schRepHead) stands in the page's flow (`.phead.rep`, as tall as what it says; folded it is
  196 px as before): the sub title under the name; one line with number, group, 집중 추진, stage, owner, the two dates; three
  columns — 요약 (운영개시 예상 and the cells of the list, read through schRepOf like the list itself, so a project from before the
  list shows what its overview held; edited, the stored value) · 핵심 지표 · 사업성 지표 (in the project's colour) · 위치 지도 / the four texts ·
  협력업체 / 사업 개요 표 · 추진 일정 · 주요 리스크 및 검토사항 — and 출처 below. Editing is the edit of before (수정 / 저장 / 취소, the lock, the
  question on leaving): every value is a `data-k` field, a cell of a list is `kpi:0:1`, `rows:3:0`, `plan:2:2`; "+ …" adds a row,
  the x empties a row and saving drops rows left empty (so no place has to be counted); the state of a step is the text of its
  cell, chosen from a menu.
- **The three marks**: wherever a value of the list is shown, "확인 필요" and "보완 필요" are orange and "자료 없음" is grey (schRepTxt:
  always through it, never by hand). While the overview is edited the text is plain.
- **Numbers are not stored.** A project's number is its place in the order of the list: the group (AIDC, Small AIDC, then the ones
  without), 최초자료일 oldest first (a month alone before its days), then the saved order (schRepSort; orderedProjects() uses it on
  the combined page). schRepNos() hands out 01, 02, …
- **The main page**: beside the title "기준일 … · 총 n건" (the day is META_FLAGS.repAsof, set by a data file). Cards: number and name,
  group · sub title, the stage on the picture, 집중 추진 in red, 운영개시 예상 as the first line when the schedule has a date, then 위치 ·
  사업주체 · 대지면적 · 연면적 · IT LOAD · 최초자료일. Table (schRepTable, all projects on one page, two lines a cell): NO. · 프로젝트 · 위치 · 사업주체 · 대지면적(m²) ·
  연면적(m²) · IT LOAD (수전용량) · 추진 단계 · 최초자료일 · 비고, grouped with counts, the pushed ones with a red number and a pale red row;
  with an order chosen the groups are not drawn. Pickers: 구분 · 추진 단계 · 위치 (시·도, the first word of the place) · 담당자 · 집중 추진 ·
  정렬 (S.pf: grp, st, region, owner, focus, sort); the search looks into name, sub title, place, 사업주체, IT LOAD, 비고, owner.
  The Excel file has the columns of the list plus group, sub title, 집중 추진, 기준일, owner, 운영개시 예상.
- **A data file of the list** ("자료 파일" beside 엑셀로 내보내기): a .json of kind `aidc-dev-report` with `asof`, optionally
  `others: "trash"`, and `projects` (id, name, match = names it had before, grp, focus, sub, stage, owner, first, asof, list {site,
  dev, area, gfa, load, memo}, kpi, fin, finNote, ov, infra, model, stat, rows, plan, risk, src; a list may be an array of
  lines). 가져오기 first shows a window with what will be made, what will be written over (by id, else by name) and which projects
  are not in the file (a box sends those to the trash; ticked when the file asks for it); nothing changes before 가져오기. Written
  over means: the overview is the file's and the name too; schedule, actions, meetings, owner and partners stay. 내보내기 writes
  the same kind of file. (At first the list's own data was kept out of the repository, which is public; the owner then decided
  to keep it in the code — see the twenty-sixth round below. The owner's PDF itself is still not committed.)
- A phone: the three columns stand below each other; the table is moved sideways (schedule/mobile.css).
- Not built (the owner's wish for later): reading the PDF itself. The data file is the form such an upload would be turned into.
- tests/schedule-16.cjs (38 checks at first, three members, one on the page as it was; 45 since the twenty-fifth round).

## One distance in the sections of the main page, a star on project cards (owner, 2026-11-24, twenty-fifth round)

- **Distances** ("타이틀과 컨텐츠, 필터 간의 거리가 다 다르잖아 … 기준은 액션으로"): on the main page the pickers of 프로젝트 · 액션 · 리서치
  stand 93 below the top of the section's title and the content (cards or table) 34 below the pickers; the tags of chosen
  conditions stand 56 below the title's top. 프로젝트 had 56 / 44 (its row of cards now starts at 147, the section is 777 tall),
  리서치 93 / 37.1. A phone keeps its own small distances (schedule/mobile.css). 미팅 of a project page was set by the owner
  earlier and is left as it is.
- **The star of a project card** (schRepCards, `[data-pstar]`): it is the page's own favourite — the same list as the star at the
  top right of a project page and the sidebar's 즐겨찾기 (S.favs, localStorage `aidc-favs`, this browser's own). Starred cards
  stand first, in the list's order among themselves, whatever order is chosen for the rest. The click is taken in the capture
  phase so the card does not open. The table (the list itself, with its numbers and groups) is not reordered and has no star.
  A browser that never chose favourites starts with 판교 starred (the list's old default), so its card stands first there.
- **Saving an overview reads `.phead [data-k]` only.** saveProjectHead used to read every data-k of the project page, and the
  schedule sections use that attribute too (tabs, pickers, the list's columns `plan`, `fin` …): junk went into the record, and
  with the lists of the review list the save stopped without a word while the list of actions was open. Records that carry
  such junk are harmless (headOf puts lists back, the rest is never read).
- tests/schedule-16.cjs (45 checks).

## The list in the code, the overview without 요약, one distance on the project page, a PDF of a project (owner, 2026-11-24, twenty-sixth round)

- **The list is in the code** (the owner, told that the repository is public: "코드에 넣어"). `devreport.mjs` is the data file of the
  review list as a module of the Worker (made from the owner's PDF; change it there when the list changes). It is not part of the
  page: `GET /api/devreport` hands it to a member who is logged in. The page puts it into a database once (applyDevReportV1 in
  shared-client.js, meta:flags `devReportV1`): schRepApply with the file — 판교 (`pangyo`) and 부산 (`busan`) are written over and
  keep their schedule, actions, meetings, owner and partners, the other 16 are made with fixed ids — and 인천 청라 and 햇빛, which are
  not in the list, go to the trash. Not on a local development database (127.0.0.1 / localhost): the suites count on the demo
  projects; tests/schedule-17.cjs calls the routine itself and therefore runs last. A later edition of the list is a new routine
  with a new flag (or the "자료 파일" of the main page), never a change of what `devReportV1` did.
- **The overview has no 요약** ("요약쪽은 메인페이지 … 그 내용이 같이 연동되기만 하면 돼 … 요약은 빼고 다른식으로 배치"). Read: the line with
  number, group, stage, owner, dates; 핵심 지표 and 사업성 지표 as two rows of tiles across the page (five in a row); below, two columns
  — the texts, 주요 리스크, 협력업체, 첨부 자료 / 사업 개요 표 (its first row is 운영개시 예상, computed), 추진 일정 — and 출처. The cells of the
  main page's list are not shown there: a cell left empty follows the sheet (schRepOf: the rows 위치 · 사업주체 · 대지면적 · 연면적 of the
  table, the first 핵심 지표 that speaks of IT / 수전), a cell that is filled in wins. They are filled in while the overview is edited
  (the block "메인 페이지 목록에 표시되는 값"; the placeholder shows what the list uses otherwise).
- **The map stands where the place is written**: inside the row 위치 of 사업 개요 표 (`.rmapbox`, the address the row mirrors into
  `loc`); no map for a place that is not known (자료 없음 / 확인 필요 / 보완 필요) or when the table has no such row.
- **One distance on the project page too** ("프로젝트페이지 안에 있는것도 다 … 통일"): 미팅 (cards and table), 액션 (일정 · 리스트 · 관계도), the
  lower section (외부설비 조달 · 승인게이트 · 근거 및 확약) and 리서치 keep the pickers 93 below the top of the title and the content 34 below
  the pickers. The gantt stood 24 and the relation map 26 below; 미팅 had its pickers in the row of the title and its cards at
  76.7 (the owner's earlier "2배") — its pickers are a row of their own now (`.sch-filters.meetf`), the views and the search stay
  beside the title, the cards start at 147 and the section is 441.7 tall.
- **A PDF of a project** ("프로젝트 만들때 pdf 첨부하는 칸"): the window that makes a project has a row 자료 PDF; the file is stored first
  (POST /api/file, 1.8 MB, item `proj-doc-<project>`) and the project is made with `docs: [{id, name, size}]`. The overview lists
  them under 첨부 자료 (PDF): the name opens the browser's PDF view in a new tab, 내려받기 saves it; while the overview is edited a
  file can be added or taken away. Reading the PDF into the sheet is not built.
- tests/schedule-16.cjs (51 checks), tests/schedule-17.cjs (12 checks, last of the run).

## Colours of projects, the calendar's tags on one line, a lighter list (owner, 2026-11-24, twenty-seventh round)

- **A project that is made gets a colour of its own** ("비슷한 컬러가 반복 … 다 다르게 … 조금 더 고채도, 판교랑 부산기장 컬러랑 비슷한 톤"):
  PROJ_TONES in original.html holds twenty saturated tones ([colour, tint for the card's picture]; classes `pj-n0` … `pj-n19` carry
  `--cc` / `--cbg` / `--csq` for pills and chips). nextProjTone() hands out one that no project has yet (when all are taken, the
  one used least); the window that makes a project, the data file and the old page's window all use it. The six pale tones
  `pj-c0` … `pj-c5` are no longer handed out; a database from before gives the projects that carry them a tone of their own once
  (meta:flags `projColorsV1`). 판교 (`pj-g`), 부산 (`pj-p`) and the other demo projects keep theirs.
- **The main calendar's project tags stand on one line** ("1줄만 나오고 접히게"): `.cal > .filters` is one line high; a button at its
  end (`[data-calpills]`) says how many tags are folded away ("+14"), opens them all ("접기") and folds them again (S.calPillsOpen,
  this page's own). schCalPillsFit runs after every draw (schAfterNav) and hides the button when all tags fit.
- **The title 프로젝트** carries the number of projects listed, in the title's own size, light grey, before the + ("프로젝트 17 +");
  the search and the pickers change it. "기준일 … · 총 n건" is no longer written there (META_FLAGS.repAsof is kept: the Excel file
  names it).
- **A card**: the star has no box — a white line (a soft shadow keeps it readable on a pale picture), yellow inside when it is on;
  no number before the name and no line "구분 · 부제" below it (the sub title is the name's tooltip).
- **The table**: a project being pushed has a small mark "집중" before its name; no red row, no red number, the name in the
  project's colour. The row keeps the class `focus`.
- **자료 없음 is a dash in the list** (cards and table: schRepListTxt); the overview keeps the words.
- tests/schedule-16.cjs (53 checks), tests/schedule-17.cjs (14 checks).

## The table in pages of ten, 비고 in the overview, the overview's lines (owner, 2026-11-24, twenty-eighth round)

- **The table of projects** (schRepTable): no note below it, no 비고 column, **ten rows a page** with the pager of the other tables
  (schVPager, S.pjPage; a search or a picker goes back to page 1). schRepSeq is the order it lists in (group by group unless an
  order was chosen). (It had a heading for every group; the thirtieth round took the headings out.) Columns of that round:
  `64px minmax(210px,1.5fr) 150px minmax(180px,1.3fr) 132px 132px minmax(200px,1.4fr) 124px 128px`.
- **비고** (`memo`) is the last row of 사업 개요 표 in the overview (shown when there is one, always while it is edited). It left the
  block "메인 페이지 목록에 표시되는 값". The Excel file and the data file still carry it; the search still looks into it.
- **No sub line under a project's name.** `sub` stays in the record (tooltip of the name in the table, search, Excel, data file)
  but is neither shown nor edited on the project page.
- **Figures** of 핵심 지표 / 사업성 지표: 19.8 px (a tenth smaller), weight 600 (one step lighter).
- **Lines of a block of the overview** (the owner's picture): one line above the block's title; no line under the title, no lines
  between the rows of a table. (Its colour and the line closing a block were changed in the twenty-ninth round, below.)
- **확인 필요 / 보완 필요** are written in the colour of the project they stand in ("프로젝트 포인트컬러로"): the overview, a row of the table
  and a card hand it down as `--pc` (schRepPc); without one the marks stay orange. 자료 없음 stays grey.
- tests/schedule-15.cjs, schedule-16.cjs (54 checks) and schedule-17.cjs (15 checks) were changed to follow; **they were not run**
  (owner, the same day: "회귀검사 내가 하라고할때만 해" — the change itself was looked at in a browser).

## The overview without notes and sources, one pale line a block (owner, 2026-11-24, twenty-ninth round)

- **No note under 사업성 지표 and no 출처 line** ("* 사업계획서 v11 … 가정", "출처 …" — "이런거 삭제"): `finNote` and `src` are neither shown
  nor edited on the project page. Both stay in the record, in `devreport.mjs` and in the data file (taken in and written out).
- **A block of the overview has one line only**: above its title, 1 px `#e3e3e3` — the thin pale grey the overview's lines had
  before ("원래 있던 그레이 라인"). The line that closed a block is gone; the next block's line separates them (36 px below a block).
- **The buttons that add a row while the overview is edited** (+ 지표, + 행, + 일정, + 협력업체, + PDF 첨부) are all `.radd`: 28 px high,
  13 px of room left and right, weight 500 (was 400), 12.5 px.
- tests/schedule-16.cjs and schedule-17.cjs follow; **not run** (regression runs only when the owner asks).

## AIDC / Small AIDC as a badge (owner, 2026-11-24, thirtieth round)

- schRepGrpTag(grp) draws the group of a project as a small badge (`.gtag`), **both groups in one light grey** (`#f1f1f0`, text
  `#6f6f6f`); a project without a group has none. It stands **between the number and the name** ("넘버랑 프로젝트 사이에"): after the
  number in a row of the table (inside the NO. cell) and in the first line of the overview ("No. 13", then the badge), and before
  the name on a card, which has no number. (A first version put it before the number and gave the two groups different tones; the
  owner corrected both.)
- **The table has no headings of groups** ("AIDC 프로젝트 9건, Small AIDC 9건 이건 빼고"). The order is still group by group
  (schRepSeq) unless an order was chosen; the badge says which group a row is of.
- The table's columns: `122px minmax(170px,1.5fr) minmax(108px,.8fr) minmax(140px,1.3fr) minmax(96px,.7fr) minmax(96px,.7fr)
  minmax(150px,1.4fr) minmax(96px,.62fr) minmax(98px,.62fr)`. Their smallest widths add up to 1076, so the table also fits the
  narrowest page (1138 wide, `--d` -200). The columns of the twenty-eighth round needed 1320 and stuck out on a window narrower
  than 1900; do not give this table fixed widths that add up to more than 1138 again.
- tests/schedule-15, 16, 17 follow; **not run**.
