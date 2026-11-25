# 기존 Bootda 참고 범위

대상: `koremp/bootda` main (`ca15c37` 이전 대화에서 조회한 스냅샷). 현재 신규 저장소에 복사한 기존 소스는 없다. 기존 저장소에 명시된 라이선스가 확인되지 않았으므로 재사용 권한을 확인하기 전 코드를 직접 복사하지 않는다.

| 기존 파일 | 확인된 동작 | 신규 구현 방향 |
|---|---|---|
| extension/extract.js | 지원 이력 및 공고 링크 추출 | 지원예정 공고 상세 파서는 별도 구현 |
| extension/company-search.mjs | 회사명 정규화 | 검색어 보조 규칙 참고, 기업 동일성은 직접 확인 |
| extension/jobplanet-lookup.js | 기업 URL, 평점, 리뷰 수 검증 | 사용자 화면 기반의 허용된 수집만 검토 |
| extension/jobplanet-page.js | 기업 선택 UI | 새 UX에서 필요한 부분만 재설계 |
| extension/background.js | 탭/세션 상태 관리, 기존 동기화 | 독립 워크플로로 재설계 |
| app/api/jobplanet/route.ts | 기존 계정 기반 조회 | 신규 프로젝트에 이전하지 않음 |

실제 최신 DOM과 사이트 정책은 단계별 구현 시 확인한다. 기존 파서의 존재가 현재 사이트에서 정상 동작하거나 사용 허가가 있음을 보장하지 않는다.
