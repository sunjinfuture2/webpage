# v2 캘린더 공휴일 표시

공휴일 날짜와 바로 오른쪽 이름만 빨간색으로 표시함. 기존 일정·영업일 계산·게시물 데이터는 변경하지 않음.
좁은 셀에서는 이름을 말줄임하고 마우스를 올리면 전체 이름을 표시함.

## API 인증키 없이 사용

기존 Nager.Date 연동을 유지함. 응답 실패 시 기존 내장 공휴일·대체공휴일 계산으로 표시함.
내장 음력 날짜 지원 범위는 2024~2030년임. 선거일·임시공휴일 등은 외부 데이터 갱신 또는 기존 추가 공휴일 설정이 필요함.
Nager.Date는 한국 정부 공식 API가 아님.

## 한국천문연구원 공식 API 사용

1. https://www.data.go.kr/data/15012690/openapi.do 에서 로그인 후 활용신청함.
2. 마이페이지 → 데이터활용 → Open API → 활용신청 현황에서 일반 인증키(Decoding)를 확인함.
3. Cloudflare → Workers & Pages → sunjin-aidc-workspace-demo → Settings → Variables and Secrets에서 Secret을 추가함.
4. 이름은 `KASI_SERVICE_KEY`, 값은 위 인증키로 지정하고 배포함. 키를 HTML·GitHub·채팅에 넣지 않음.
5. 페이지를 새로고침함. 브라우저 캐시는 최대 1시간 유지될 수 있음.

키가 있으면 공식 특일 정보의 `getRestDeInfo`를 우선 사용하며 `isHoliday=Y`인 날짜만 표시함.
서버는 정상 결과를 하루 캐시함. 장애 시 보관된 데이터와 내장 계산을 사용함. 공식 API 오류나 키 오류를 공휴일 없음으로 저장하지 않음.
배포 시 기존 게시물·일정 저장소와 바인딩을 유지함.

검증: `node --test tests/holiday-labels.test.mjs`, `npm run build`.
