AIDC 워크스페이스 프로젝트 전달본 (2026-11-06)

1. ZIP을 풀고 aidc-workspace-new 폴더를 Claude Code의 Local에서 여세요.
2. Node.js 22 이상을 설치한 컴퓨터에서 프로젝트 폴더 터미널을 여세요.
3. npm install
4. npm run dev (로컬 실행; 터미널에 표시된 주소로 접속)
5. 배포할 때: npm run login → 브라우저에서 해당 Cloudflare 계정 권한 승인
6. npm run check-account로 계정 확인
7. npm run deploy

배포 대상: sunjin-aidc-workspace-demo
주소: https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/

파일 안내
- original.html: 기본 화면 및 화면 동작 원본
- shared-client.js: 사용자 로그인, 실시간 공유, 편집 잠금, 화면 갱신
- shared-worker.mjs: 서버 API와 Durable Object 데이터 저장
- build-shared.mjs: 원본을 조합하여 public/index.html 및 seed.json 생성
- public/index.html: 배포용 생성 결과 (이 파일만 수정하면 다시 생성할 때 덮어써집니다)
- seed.json: 최초 빈 저장소에 넣는 예시 데이터; 실제 운영 DB 백업이 아닙니다
- wrangler.jsonc: 기존 Worker와 데이터 저장소 연결 설정

Claude에게 전달할 요청
"README.txt와 CLAUDE.md를 읽고 이 프로젝트를 이어서 수정해줘. 원본과 생성 코드를 수정하고 npm run build로 최종 HTML을 만들어줘. 실제 배포는 sunjin-aidc-workspace-demo에만 하고 기존 운영 데이터와 Durable Object 연결을 유지해줘."

이 전달본에는 로그인 비밀번호, Cloudflare 인증 토큰, API 키, 실제 운영 DB 백업이 포함되지 않습니다.
다른 컴퓨터에서는 별도로 Cloudflare에 로그인하고 해당 계정의 배포 권한을 받아야 합니다.
로컬 실행의 데이터는 로컬 전용입니다. 기존 서버 게시물은 원래 Cloudflare 저장소에 그대로 있습니다.
배포 대상 이름, WORKSPACE 바인딩, Workspace 클래스, team 인스턴스 이름, shared-v1 마이그레이션은 기존 데이터와 연결되므로 임의 변경하지 마세요.

원래 PC의 전용 경로를 사용하던 deploy-shared.mjs는 전달본에서 제외했습니다.
전달본은 프로젝트 내부에 설치한 Wrangler를 이용하는 표준 npm run deploy 방식으로 구성했습니다.
Cloudflare 실제 재배포는 수행하지 않았습니다.

Cloudflare 자동 배포 연결
GitHub 저장소(sunjinfuture2/webpage)의 GitHub Actions 워크플로 .github/workflows/deploy-cloudflare.yml 이 배포를 담당합니다.
main 브랜치 또는 claude/ 로 시작하는 브랜치에 aidc-workspace-new 변경이 푸시되면 자동으로 npm ci → npm run deploy 를 실행하여
sunjin-aidc-workspace-demo Worker에 배포합니다. GitHub 저장소의 Actions 탭에서 수동 실행(Run workflow)도 가능합니다.
package-lock.json 은 CI가 동일한 Wrangler 버전을 설치하기 위한 파일이므로 함께 커밋합니다.

최초 1회 설정 (GitHub 저장소 관리자가 수행)
1. Cloudflare 대시보드 → 내 프로필 → API 토큰 → 토큰 생성 → "Cloudflare Workers 편집" 템플릿 선택
   (wrangler.jsonc의 account_id 계정을 선택, Workers Scripts 편집 권한 포함)
2. GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret
   이름: CLOUDFLARE_API_TOKEN / 값: 1번에서 만든 토큰
3. 이후 푸시마다 Actions 탭에서 배포 결과를 확인합니다. 시크릿이 없으면 워크플로가 안내 메시지와 함께 실패합니다.

토큰은 저장소 파일이나 채팅에 적지 마세요. 자동 배포는 기존 Worker 이름, WORKSPACE 바인딩, Durable Object 데이터를 그대로 유지합니다.
