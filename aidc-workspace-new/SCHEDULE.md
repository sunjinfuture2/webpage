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
- Holidays: red dates without names. schHolBuilt (fixed dates, the lunar ones of SCH_LUNAR, substitute days by rule) plus
  what the Worker finds (/api/holidays: date.nager.at, asked at most once a month, kept in table `holidays`; only the year is
  sent) plus SETTINGS.holidays (설정 › 워크스페이스 › 일반). The outside service cannot be reached from the build environment:
  only the built-in part is covered by the test.
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
- Pulling the ground of the gantt writes the scroll position into SCH.gs at once (a redraw held back during the pull runs
  on letting go and used to put the chart back a few pixels, because the scroll event had not arrived yet).
- tests/schedule-8.cjs has these; tests/schedule-1.cjs checks the new starting point of a relation.

## Not done yet (say so when asked)

- Links between projects (portfolio): relations between tasks of different projects.
- Realtime co-editing of the schedule itself is field-level merging (last write wins inside one task); there is no lock on a task.
- Working calendars, resources, cost: out of the brief's first scope.
- Taking over the gate / evidence sheets of an imported workbook (see Excel above).
- A milestone has no circles to pull a relation from (it can be the target of one; its own relations are added in its panel).
