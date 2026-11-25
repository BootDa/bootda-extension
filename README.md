# 붙다 · Bootda Extension

채용공고와 기업 정보를 확인하고 Google Sheets에 정리하는 Chrome 확장프로그램.

## 상태

초기 개발 기반(0.1.0). 팝업과 공통 데이터 모델만 준비되어 있습니다. 사람인/잡플래닛 수집, Google OAuth 및 Sheets, LLM API는 아직 구현되지 않았습니다. 기존 Bootda 웹 서비스와 별도 제품입니다.

## 로컬 실행

Node.js 22 이상 및 npm 사용을 권장합니다.

```sh
npm install
npm run typecheck
npm run test
npm run build
npm run verify:foundation
```

Chrome `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/dist` 선택. 팝업에서 초기 화면을 확인합니다. OAuth 및 API 비밀값은 초기 화면 실행에 필요하지 않습니다.

최초 `npm install`에서 생성한 `package-lock.json`을 검토하여 커밋하고 이후 CI에서는 `npm ci`를 사용합니다.

## 문서

- [개발 지침](AGENTS.md)
- [아키텍처](docs/architecture.md)
- [사용자 흐름](docs/user-flow.md)
- [개발 계획](docs/development-plan.md)
- [기존 코드 참고 범위](docs/legacy-reference.md)
- [릴리스 노트](docs/extension-release-notes.md)
