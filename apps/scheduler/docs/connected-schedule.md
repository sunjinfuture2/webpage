# 연결 일정과 프로젝트 간 영향 분석

작성·공식 출판 원문 확인: 2026-11-09 (Asia/Seoul).

이 문서는 SUNJIN Schedule의 연결 간트, 업무 관계도, 프로젝트 간 선후행 계산을 위한 구현 계약과 검증 기준이다. 계산은 사용자가 가져온 프로젝트 데이터를 사용한다. 공개 저장소에는 원본 업무 문서와 실제 일정이 보이는 검증 이미지를 포함하지 않는다.

## Microsoft 공식 자료에서 확인한 동작

Microsoft Learn 직접 접근은 현재 클라우드의 HTTP 정책에서 거부됐다. 대신 허용된 GitHub의 **MicrosoftDocs/VBA-Docs** 공식 출판 원문을 조회했다. 아래 사실은 실제 HTTP 200 응답의 원문에서 확인했다. 출판 원문의 다수 항목은 `ms.date: 06/08/2017`인 데스크톱 Project 개체 모델 문서다. 이는 2026년 Planner의 라이선스별 기능 지원을 확인한 자료가 아니다.

| 확인한 개념 | 공식 출판 원문 | 적용 결정 |
| --- | --- | --- |
| 작업 관계는 유형과 간격을 가진다 | [TaskDependency](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.TaskDependency.md) | 선후행 관계를 실제 모델에 저장하고 화면과 계산이 같은 관계를 사용한다. |
| FF·FS·SF·SS 네 유형 | [PjTaskLinkType](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.PjTaskLinkType.md) | 시작·완료 연결점을 유형에 맞게 그린다. |
| 관계 추가의 기본 유형은 FS, 기본 간격은 0 | [TaskDependencies.Add](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.TaskDependencies.Add.md) | 새 관계의 초기 값을 명시하고 편집할 수 있게 한다. |
| 음수 간격은 lead, 문자열의 기본 단위는 일, 숫자는 분 | [TaskDependency.Lag](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.TaskDependency.Lag.md), [LagType](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.TaskDependency.LagType.md) | 현재 앱의 정수 달력일과 Project API의 분 단위를 혼동하지 않는다. |
| 통합 프로젝트의 선행·후행 프로젝트를 별도로 지정할 수 있다 | [Application.LinkTasksEdit](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Application.LinkTasksEdit.md) | 다른 프로젝트의 업무를 고정 식별값으로 참조한다. |
| 외부 업무는 다른 프로젝트 업무의 placeholder일 수 있다 | [Task.ExternalTask](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.ExternalTask.md), [TaskDependency.Path](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.TaskDependency.Path.md) | 관계 표시용 외부 노드와 실제 계산 대상 업무를 구분하고 원본을 중복 생성하지 않는다. |
| 총여유는 프로젝트 완료를 늦추지 않고 업무 완료를 미룰 수 있는 시간이며 API 단위는 분 | [Task.TotalSlack](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.TotalSlack.md) | 프로젝트별 목표와 전체 목표의 여유를 구분한다. |
| 날짜 결정 원인은 선행·달력·실제일·하위 업무 등으로 나뉜다 | [StartDriver](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.StartDriver.md) | 모든 연결과 실제 날짜를 지배하는 조건을 구분해서 설명한다. |
| 달력에는 예외, 요일, 근무 주간이 있다 | [Calendar](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Calendar.md) | 달력일 모드를 근무시간 기반 달력의 구현으로 간주하지 않는다. |
| 자원 달력과 업무 달력의 적용 여부가 일정에 영향을 준다 | [Task.IgnoreResourceCalendar](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.IgnoreResourceCalendar.md) | 담당자 이름만으로 자동 자원 평준화가 구현됐다고 표시하지 않는다. |
| 수동 일정과 자동 일정을 구분한다 | [Task.Manual](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.Manual.md) | 이번 릴리스의 계산은 자동·달력일 기준이다. 수동 모드 전체 호환은 후속 범위다. |
| ASAP·ALAP·SNET·SNLT·FNET·FNLT·MSO·MFO 제약이 있다 | [PjConstraint](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.PjConstraint.md) | 현재 관리일 하한을 여덟 제약의 완전 구현이라고 부르지 않는다. |
| 실제 시작·완료와 잔여기간은 별도 속성이다 | [ActualStart](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.ActualStart.md), [ActualFinish](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.ActualFinish.md), [RemainingDuration](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.RemainingDuration.md) | 기존 실적과 공란을 유지하며 예상만 재계산한다. |
| 평준화로 인한 지연은 별도의 계산 결과다 | [Task.LevelingDelay](https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.Task.LevelingDelay.md) | 자원 중복과 명시적인 선후행 관계를 구분한다. |

Project의 숫자 관계 코드는 FF=0, FS=1, SF=2, SS=3이다. 앱 내부는 문자열 `FS/SS/FF/SF`를 사용한다. Project XML/다른 API의 숫자 코드를 교환할 때는 해당 스키마별 변환을 별도로 검증한다.

첨부 화면의 Grid·Timeline 패턴은 디자인·상호작용 참고로 사용한다. Project desktop, Project for the web 계열 화면, 현재 Planner의 제품별 지원 범위를 한 기능표로 합쳐 단정하지 않는다. 최신 Planner 라이선스·서비스 수명·MPP/Project XML 왕복 호환은 이번 조사에서 확인하지 않았다.

## 화면 구성과 디자인 규칙

사용자가 지정한 WorkSpace는 업무의 공통 디자인 기준이다. 새 workers.dev 참조 URL은 현재 HTTP 정책에서 접근이 거부되어 최신 화면을 직접 읽지 못했다. 기존에 확보한 사용자 참조 HTML의 Pretendard, `#F47920`, 검정 제목, 중립색 본문, 밝은 사이드바, 얇은 구분선과 우측 상세 패널을 적용한다. 기존 참조의 1920px 고정 폭은 앱에 적용하지 않는다.

| 보기 | 다루는 질문 |
| --- | --- |
| 연결 간트 | 이 업무는 언제이며, 무엇의 시작·완료와 연결되는가? |
| 업무 관계도 | 어떤 선행·후행·분기·합류가 있으며 어디로 이동해야 하는가? |
| 프로젝트 연결 | 다른 프로젝트의 어느 업무가 이 프로젝트에 영향을 주는가? |
| 변경 영향 | 어떤 업무의 날짜가 얼마나 바뀌었고, 어떤 관계가 원인인가? |

연결선의 기본색은 중립색, 선택·활성 동작은 주황색으로 표현한다. 크리티컬, 근접, 조건부 제외는 문자와 범례를 함께 사용한다. 담당자·진척·작업량이 비어 있으면 임의 인물·진척 막대·시간을 넣지 않는다.

간트는 네 유형의 시작·완료 연결점을 정확하게 연결한다. 선 선택으로 관계 정보를 열고 수정·삭제할 수 있어야 한다. 포트로 관계를 만들 때도 상세 편집과 같은 검증을 사용한다. 키보드와 모바일에서는 관계 목록·폼으로 접근할 수 있어야 한다.

가상화, 단계 접기, 필터, 화면 밖 업무 때문에 관계가 없어진 것으로 보이면 안 된다. 숨겨진 연결 수와 업무 이동 수단을 제공한다. 관계도의 노드 제한은 표시 범위만 줄이고 계산 모델 전체를 유지한다.

## 계산 계약

현재 원본 호환 프로필은 달력일과 양끝 포함 기간을 사용한다. 일반 업무의 기간은 `완료일 - 시작일 + 1`, 마일스톤은 0일이다. 이 프로필의 FS 조건은 `후행 시작 >= 선행 완료 + 1 + 간격`이다. 근무시간 기반 모드는 분 단위 시간, 근무·휴일 달력, 경계 시각을 별도로 구현해야 한다. 기존 파일을 근무시간 모드로 자동 전환하지 않는다.

한 프로젝트의 연결과 프로젝트 사이 연결을 같은 활성 그래프에서 검증한다. 입력 프로젝트의 업무·관계·조달·지원기간 참조는 내부 합성 식별값으로 매핑하되, 화면·출처·저장된 원본 식별값은 보존한다. 같은 업무 ID가 서로 다른 프로젝트에 있어도 충돌해서는 안 된다.

프로젝트별 상태일, 실제일, 잔여기간, 조달 납기, 월 기준 지원기간을 유지한다. 합성 계획의 단일 상태일을 모든 업무에 덮어쓰지 않는다. 프로젝트별 운영·완료 기준은 각 프로젝트의 원래 업무로 평가한다. 전체 목표의 경로와 프로젝트 목표의 경로는 따로 해석한다.

변경 계산의 순서:

1. 입력의 복사본에 변경을 적용한다.
2. 각 프로젝트가 사용할 시나리오와 계획 버전을 선택한다.
3. 내부 관계, 프로젝트 간 관계, 계산에 필요한 파생 관계를 검증한다.
4. 전체 그래프의 순환과 잘못된 업무 참조를 거부한다.
5. 선행 순서로 예상일을 계산하고 목표별 여유를 역산한다.
6. 이전 결과와 비교해 실제 날짜가 바뀐 업무·프로젝트를 구한다.
7. 적용할 때 연결 상태와 입력을 한 작업공간 변경으로 저장한다.

연결된 모든 업무가 반드시 같은 일수만큼 밀리는 것은 아니다. 기존 관리 시작일이나 다른 선행 조건에 여유가 있으면 지연을 흡수한다. 연결된 업무, 이번에 실제로 날짜가 바뀐 업무, 날짜를 결정한 선행 조건을 구분한다.

실제일을 고정한 결과 관계를 위반하면 해당 사실을 표시한다. 실제일·원본 참조일을 그래픽 정렬을 위해 이동하지 않는다. 기간이 있는 완료 기준 업무의 여유는 늦은 완료에서 기간 오프셋을 뺀 늦은 시작으로 계산해야 한다.

## 프로젝트·시나리오·저장

단일 프로젝트의 기존 v1 백업을 계속 읽는다. 프로젝트 연결은 선택적인 `portfolio` 필드(현재 시나리오)와 `scenarioPortfolios`(다른 시나리오의 독립 연결 묶음)로 확장하며, 다른 프로젝트의 가져온 작업공간과 연결 정보를 현재 작업공간 백업에 함께 보존한다. 중첩 포트폴리오는 허용하지 않는다.

참조에는 프로젝트 ID와 업무 ID가 필요하다. 실제 계산 계획은 각 프로젝트의 선택된 시나리오와 계획 `updatedAt` 버전으로 구분한다. 화면 행 번호·정렬 순서·표시 이름으로 연결하지 않는다. 같은 파일을 가져와도 현재 작업공간과 가져온 프로젝트를 명시적으로 구분한다.

로컬 연결 프로젝트는 가져온 시점의 독립 데이터다. 다른 브라우저·기기·사용자의 원본 저장소에 자동으로 접속하거나 동기화하는 기능이 아니다. 자료를 갱신할 때는 가져온 버전과 연결 대상을 확인해야 한다. 외부 시스템을 확인하지 못했는데 최신화가 완료됐다고 표시하지 않는다.

프로젝트 간 연결과 외부 계획 변경은 같은 전체 작업공간의 이력에 저장한다. 시나리오를 복제하면 외부 계획과 관계도 복제하고, 시나리오를 전환할 때 해당 연결 묶음을 복원한다. 적용 거부·취소·실행취소·다시실행 후에도 관계와 계획이 함께 일치해야 한다. 다른 탭의 저장 버전이 바뀌면 기존 충돌 보호를 유지한다.

## 수용 검증

공개 테스트는 실제 사업 문서와 분리한 합성 프로젝트로 작성한다.

- FS·SS·FF·SF와 양수·음수 간격을 확인한다.
- 프로젝트 A의 변경이 연결된 B에 전파되고 무관한 C는 유지되는지 확인한다.
- 연결은 있지만 일정 여유 때문에 B 날짜가 유지되는 경우를 확인한다.
- 프로젝트를 넘는 순환, 내부 관계와 외부 관계를 합쳐 생기는 순환을 거부한다.
- 누락 참조, 중복 식별, 잘못된 간격과 같은 입력을 거부한다.
- 프로젝트별 상태일·실제일·조달·지원기간 규칙과 입력 불변성을 확인한다.
- 연결 전후 날짜와 영향 목록이 실제 계산 결과에 일치하는지 확인한다.
- 기존 v1 백업, 선택적 연결 데이터, JSON/XLSX 복원, 전체 이력 복원을 확인한다.
- 정렬·필터·접기·스크롤·노드 제한 후에도 계산과 원본 관계가 유지되는지 확인한다.
- 실제 브라우저에서 간트 관계 생성·편집·삭제와 관계도 탐색, 프로젝트 변경·저장·복원을 검증한다.

원본 문서에 대한 회귀 검사는 비공개 로컬 자료로 수행한다. 이전에 통과한 결과와 이번 코드에서 새로 실행한 결과를 구분한다. 성능 목표와 측정값을 구분하고, 큰 합성 그래프의 계산과 화면 렌더링을 각각 기록한다.

## 구현 경계

이번 작업은 달력일 호환 엔진을 사용하는 독립 단일 사용자 앱의 연결 그래픽·관계 탐색·복수 프로젝트 계산 확장이다. 정식 서버 인증·프로젝트 권한, 공동 편집·기기 간 동기화, 근무시간 달력, 자원 배정·평준화, 여덟 제약의 전체 동작, 정식 승인 기준선, MPP/Project XML 왕복, 홈페이지 실제 통합은 별도 작업이다.

다음 작업 전에는 최신 제품별 공식 문서와 대표 Project 파일을 대조하고, 각 기능을 구현·부분 구현·후속 범위로 표시해야 한다. 연결선을 그리는 것만으로 일정 계산·공유·다른 제품과의 완전 호환이 구현됐다고 설명하지 않는다.
