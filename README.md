# 붙다 · Bootda Extension

채용공고와 기업 정보를 확인하고 Google Sheets에 정리하는 Chrome 확장프로그램.

## 상태

초기 개발 기반(0.1.1). WXT, TypeScript, React, Tailwind CSS v4, shadcn/ui를 사용하고 공고 데이터 검증에는 Zod를 사용합니다. 사람인/잡플래닛 수집, Google OAuth 및 Sheets, LLM API는 아직 구현되지 않았습니다. 기존 Bootda 웹 서비스와 별도 제품입니다.

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

테스트는 임시 Chrome 프로필에 확장을 로드하고 툴바 동작으로 팝업을 엽니다. 버전 배지의 문구와 스타일을 검사한 뒤 `coverage/chrome-popup.png`에 화면을 저장합니다.

## 문서

- [개발 지침](AGENTS.md)
- [아키텍처](docs/architecture.md)
- [사용자 흐름](docs/user-flow.md)
- [개발 계획](docs/development-plan.md)
- [기존 코드 참고 범위](docs/legacy-reference.md)
- [릴리스 노트](docs/extension-release-notes.md)
