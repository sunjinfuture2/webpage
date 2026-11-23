# My page

The owner's specification "AIDC 마이페이지 고도화 개발 명세서" (2026-11-19, 27 pages) asks for four menus — 계정 · 수신함 · 설정 · 휴지통 —
plus 로그아웃, for the removal of two entries, and for the Worker to be the last word on who may do what. The owner said to decide open
points myself. This file says what was built, where it lives, and which points of the specification were left out and why.

## Where things are

- `mypage/10-mypage.js`, `mypage/mypage.css`: the new window. The build adds them to the page the way it adds `schedule/ui`
  (one inline script that shares the page's globals, one `<style id="mp-style">`).
- It draws into the modal the page already had (`#ovl / #modal / #mnav / #mbody`). `openModal`, `closeModal` and `renderPane`
  in original.html hand over to `mpOpen / mpClosed / mpRender` while the preview is on (`PREVIEW_ON`, the same switch as the
  schedule: `?v=2`). Without the preview the old window is drawn by `renderPaneBase`, which the new one also uses for the tabs
  that did not have to change (멤버, 팀스페이스, 업데이트, 보안, 감사 로그, 사용 현황).
- For everybody, preview or not: the removals (DEL), the word 휴지통, the restore rule, the role rules, 99+.
- The Worker (`shared-worker.mjs`): `roles()`, `hidden()`, `denied()`, `/api/sessions`, `/api/session`, `purgeTrash()`.

## Decisions

- **Feature flag.** The new window is behind the preview switch, as the specification's migration plan asks ("새 UI를 feature
  flag로 단계 전환"). The server rules are not behind it: they are what the page already promised.
- **Roles on the Worker.** Until somebody is 소유자 everybody may manage (unchanged, owner decision 2026-11-12). From then on:
  only an owner changes roles; the last owner cannot be demoted; team-space membership and other members' entries of
  `meta:members` are for owner / manager; `meta:settings` is for owner / manager (except `projTrash`, which deleting a project
  writes, and `templates`, the editor's shared templates); deleting an item for good is for an owner (a member may still drop their own draft); the audit log
  (`/api/history?audit=1`) is for owner / manager.
- **A refusal does not jam the queue.** A refused *field* is left out of the request and the record comes back as the server has
  it, with `denied: [{id, field, why}]`, so the page (also a page built before this change) shows the server's value again. A
  refused *whole record or delete* answers 403 with the same `denied`; `sharedDenied()` takes the server copy back. MIN_CLIENT
  stays 4.
- **Private records.** `meta:inbox:<사번>` of other members and other members' drafts (also trashed drafts) are neither sent
  (`/api/state`, live socket) nor writable. The demo drafts the design lists (`table / card / cal`) stay listed.
- **Personal settings** live in `prefs` inside my own inbox record, so they follow me to every device. `archived` there is the
  list of notices put away. Selection in the inbox is page state only.
- **Saving.** A form says 저장됨 only after the Worker took the change (`mpCommit`). When the send fails the change stays queued
  (the page retries by itself) and the form says so until it is through. Leaving a form with changes never asks (owner rule
  2026-11-18): what was typed stays, the tab carries a dot, closing the window offers "이어서 편집" in a toast.
- **No pretend switches.** Theme, language, date format, time zone, e-mail and push notifications are stated as what they are
  (one fixed value / not supported) instead of switches that store something nothing reads (specification, ADM-07).
- **Trash.** Restore brings an item back to `prevStatus`; when that was never recorded it comes back as a draft, not published.
  Everything in the trash is purged by the Worker after 30 days (items with files and versions, partners, 자료실 cards,
  projects) and the purge is written to the history as `auto-purge`.
- **Schedule tools.** DEL-02 removes their only way in (the entry of the user menu). The functions are untouched
  (`schToolsMenu(anchor, pid)`); Excel import / export, backup and scenarios are simply not reachable from the page now.

## Specification, point by point

Done = built and covered by `tests/mypage-1.cjs` (82 checks). Part = the part that this app can do without new infrastructure.

| id | state | note |
| --- | --- | --- |
| DEL-01 | done | no export entry, no `canExport`, no "내보내기 제한" (a stored `exportAdminOnly` is ignored) |
| DEL-02 | done | `schUserMenu` removed; see "Schedule tools" above |
| DEL-03 | done | schedule views, `meta:sched:*`, attachment downloads untouched |
| ACC-01 | done | 계정 › 프로필: photo, name, 직책, e-mail, 연락처 (phone, added 2026-11-23: shown with the e-mail on the member card that opens from an assignee's name); 사번 · 역할 · 소속 read only |
| ACC-02 | done | upload / replace / remove; cut square to 256 px JPEG in the browser; stored as a file, id in `meta:members.<사번>.avatar` |
| ACC-03 | part | format and duplicate check, shown as 미인증. No verification mail: there is no mail service |
| ACC-04, ACC-05 | not done | SSO / OTP / passkeys need an identity provider; login stays 사번 only (owner decision 2026-11-12) |
| ACC-06 | done | 계정 › 로그인 · 기기: list, this device, end one, end all others (socket closed, history entry) |
| ACC-07 | done | 내가 작성 / 내 담당 / 초안, search, type and project filter, 50 at a time |
| ACC-08 | done | drafts are private on the Worker too |
| ACC-09 | not done | leaving / deactivating an account needs an account state the app does not have |
| ACC-10 | part | 사번 can be copied; no change history of the profile |
| INB-01 | not done | notices are still derived from comments / mentions / reminders. Stored events need a notification table and a writer for every source; see "Not done" |
| INB-02 | done | 전체 · 읽지 않음 · 보관함, last tab remembered per browser |
| INB-03 | part | kind (멘션 / 댓글 / 날짜 알림), project, search. No period filter; no server paging (the list is derived in the page) |
| INB-04 | done | selection and read state are separate; read ↔ unread both ways |
| INB-05 | done | 보관 ↔ 보관 해제 with 실행 취소 (5 s) |
| INB-06 | not done | no grouping by page / thread |
| INB-07 | done | selected → 읽음 / 읽지 않음 / 보관, 모두 읽음 (n), 읽은 알림 보관 (n): the numbers are the current filter's |
| INB-08 | part | opens the item (read only when it really opens); a deleted / hidden source says so. No jump to the comment |
| INB-09 | part | the reply is a comment on the source item, as before (no parent id) |
| INB-10 | part | per kind in 설정 › 알림 (멘션 fixed on). No per-page subscription |
| INB-11 | not done | mentions are still matched by name; needs mention ids in the editor and the comment field |
| INB-12 | part | badges live across devices, 99+, empty / no-result states apart. The inbox is not a side panel |
| SET-01 | done (2026-11-23) | 테마: 라이트 · 다크 · 시스템 설정에 맞춤 (the member's own setting; also a moon / sun in the top bar beside the 미리보기 badge, which switches between light and dark) |
| SET-03, SET-04, SET-05 | not done | one language, one date format, browser time zone: stated as such in 기본 설정 |
| SET-02 | part | 화면 움직임 줄이기; visible keyboard focus. No high-contrast theme |
| SET-06, SET-08, SET-09 | not done | P2 / nothing to configure yet |
| SET-07 | done | Enter or Ctrl / ⌘ + Enter; never while an IME composition is open |
| SET-10 | done | search of the settings jumps to the row; 개인 설정 초기화 with 실행 취소 |
| ADM-01 | done | 일반: name, 소속, dropbox address (https only), since the eighth round extra holidays of the calendars (`SETTINGS.holidays`), and since the seventh round the footer's links (`SETTINGS.links`: 그룹웨어, 홈페이지, YouTube, Instagram, Facebook); owner / manager save, members read |
| ADM-02 | done | bootstrap ends with the first owner; the Worker enforces it and protects the last owner |
| ADM-03 | part | list, add ahead of first login, roles by the owner. No invitations / deactivation (no mail, no account state) |
| ADM-04 | part | a member can no longer assign themself to a team space |
| ADM-05 | not done | "비공개" of a team space is a label; content has no team ACL. A real ACL touches every list, search, file and socket message |
| ADM-06 | part | add / rename / delete as before |
| ADM-07 | part | login lifetime is real (the Worker's session length); nothing else is offered |
| ADM-08 | part | audit log limited to owner / manager on the Worker; no filters |
| ADM-09 | part | renamed 사용 현황; counts as before |
| TRS-01 | done | one word, one list for items, partners, 자료실 cards, projects |
| TRS-02 | part | search (title, place, who), type filter |
| TRS-03 | done | who, when, where it was, earlier state, days left ("—" when unknown) |
| TRS-04 | done | read-only preview (plain text of the body) |
| TRS-05 | done | see "Trash" above |
| TRS-06 | done | several at once, the toast says how many came back as drafts |
| TRS-07 | part | owner only, on the Worker; asks first. No re-authentication (there is no password) |
| TRS-08 | done | owner only; the question names the number and only those are removed |
| TRS-09 | done | all four kinds purged by the Worker |
| TRS-10 | part | files and versions go with an item; history keeps a line without content |
| COM-01 | part | the window never exceeds the page; narrow screens are handled by the page's own scaling (fitLayout), not by a second layout |
| COM-02 | done | role=dialog, aria-modal, focus kept inside, Esc, focus returned, buttons for navigation |
| COM-03 | done | see "Saving" |
| COM-04 | done | without a dialog, by the owner's rule |
| COM-05 | done | loading / empty / no result / error with retry (sessions, audit) |
| COM-06 | part | search and filters with "필터 지우기"; no cursor paging |
| COM-07 | done | admin tabs are not offered to members, and the Worker refuses what they could still send |
| COM-08 | part | address `#…&my=<menu>.<tab>`; no load tests |

## Not done, and what it would take

- **Real authentication, e-mail verification, mail / push notifications, invitations**: an identity provider and a mail service.
  The login decision (사번 only) is the owner's; changing it is theirs to decide.
- **Stored notification events with subscriptions (INB-01, 06, 08, 10, 11)**: a `notifications` table in the Durable Object,
  written inside `/api/change` for comments, mentions (by id), assignments and reminders, and a migration of the read state that
  is now keyed by derived ids. Worth doing as one piece, not in passing.
- **Team-space ACL (ADM-05)**: every read path of the Worker would have to filter by membership.
- **High contrast**: not done. (The dark theme is done by drawing the page through one filter, see SCHEDULE.md; a high-contrast look would need colour tokens first: the page has about 1,100 colour values written out.)
- **The v2 REST API of chapter 18**: the page still syncs through `/api/change`; the rules of the specification were put into
  that path instead of adding a second API beside it.
- **Automatic purge**: not covered by a test (it runs at most hourly inside the Worker); read `purgeTrash()`.
