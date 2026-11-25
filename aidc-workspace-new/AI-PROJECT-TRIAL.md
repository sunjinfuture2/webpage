# AI적용테스트 프로젝트
적용 범위: ai-application-test 프로젝트 개요만. 캘린더 이하 및 기존 개요 업로드 방식은 유지.
## API 키 등록
Cloudflare → Workers & Pages → sunjin-aidc-workspace-demo → Settings → Variables and Secrets → Add → Secret.
이름 ANTHROPIC_API_KEY, 값은 Claude Console에서 발급한 키. 저장 후 Deploy.
AI적용테스트 모델: claude-fable-5-2 (high). 이 시험 프로젝트는 해당 모델로 고정함.
키는 브라우저나 GitHub에 저장하지 않는다. Claude API 사용료는 별도.
## 직접 입력
파일과 API 키 없이 수정 버튼으로 개요를 직접 작성·저장할 수 있다. AI 업로드는 선택 기능이다.
## 사용
프로젝트 AI적용테스트 → 문서로 개요 구성 → PDF/PPTX 선택 → 대상 사업(필요시) → AI로 개요 구성.
원문 근거·확인할 내용·미리보기를 검토하고 필요시 내용 수정 후 적용.
PDF는 페이지 전체, PPTX는 슬라이드 텍스트 분석(그림·차트는 PDF 변환 권장).
한 파일 10MB 이하. 원본을 이 기능에서 서버에 보관하지 않으며 결과만 저장한다. 원본은 사용자가 보관한다.
섹션의 제목·유형·순서는 AI가 정한다. 고정 사업 컬럼을 요구하지 않는다.
프롬프트: ai-project.mjs의 AI_PROMPT, UI에서 열람 가능. 추가 지침을 입력할 수 있다.
## 검증
npm ci; node tests/ai-project.test.mjs
npm run build 후 wrangler dev --local --compatibility-date 2026-10-13
Playwright 설치 후 node tests/ai-project-browser.cjs
브라우저 테스트의 AI 응답은 명시적인 모의 응답이며 유료 API의 실제 문서 이해 정확도를 검증하지 않는다.
## 변경 기록 (5줄 이내)
기존 프로젝트와 분리된 AI적용테스트 생성, 개요 영역만 동적 섹션 렌더링.
Claude PDF/PPTX 텍스트 분석, 프롬프트·추가 지침·출처·확인 필요 항목 제공.
결과 수정·검토·저장·다시 열기, 동시 수정 충돌 방지.
API 키는 Worker Secret으로만 보관, 캘린더·기존 프로젝트 추출 코드는 유지.
실제 Claude 문서 분석은 사용자 키 등록 후 확인 필요.
