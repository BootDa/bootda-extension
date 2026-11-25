# 붙다 · Bootda Extension

채용공고와 기업 정보를 확인하고 Google Sheets에 정리하는 Chrome 확장프로그램.

## 상태

개발 버전 0.2.0. 사람인 상세 공고를 열고 확장 팝업에서 **현재 공고 읽기**를 누르면 회사명, 공고 제목, 마감일을 확인할 수 있습니다. 잡플래닛 조회, Google Sheets 저장, LLM 분석은 구현 전입니다.

## 로컬 실행

Node.js 22 이상과 `package.json`에 지정된 pnpm 버전이 필요합니다.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run verify:foundation
```

Chrome `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/dist/chrome-mv3` 선택. 팝업에서 초기 화면을 확인합니다. OAuth 및 API 비밀값은 초기 화면 실행에 필요하지 않습니다.

### 실제 Chrome 팝업 테스트

데스크톱 환경에서 Chrome for Testing을 한 번 설치한 후 빌드와 테스트를 실행합니다.

```sh
pnpm exec puppeteer browsers install chrome
pnpm run build
pnpm run test:chrome
```

테스트는 임시 Chrome 프로필에 확장을 로드하고 툴바 동작으로 팝업을 엽니다. 버전 배지의 문구와 스타일, 사람인 공고 예제의 필드와 오류 안내를 검사합니다. 팝업 화면은 `coverage/chrome-popup.png`에 저장됩니다.

PowerShell에서 `$env:BOOTDA_TEST_LIVE_SARAMIN='1'`을 설정하면 같은 명령으로 실제 사람인 공고(55644102)도 확인합니다. 이 검증은 외부 사이트 접속과 해당 공고 공개 상태에 의존합니다.

## 문서

- [개발 지침](AGENTS.md)
- [아키텍처](docs/architecture.md)
- [사용자 흐름](docs/user-flow.md)
- [개발 계획](docs/development-plan.md)
- [기존 코드 참고 범위](docs/legacy-reference.md)
- [릴리스 노트](docs/extension-release-notes.md)
