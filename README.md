# 붙다 · Bootda Extension

채용공고와 기업 정보를 확인하고 Google Sheets에 정리하는 Chrome 확장프로그램.

## 상태

0.1.1에서 사람인 채용공고의 기업명, 제목, 마감일, 공고 ID와 원문 주소를 확인할 수 있습니다. 잡플래닛, Google Sheets, 기술스택 분석은 개발 예정입니다. 기존 Bootda 웹 서비스와 별도 제품입니다.

## 로컬 실행

Node.js 22 이상 및 npm 사용을 권장합니다.

```sh
npm ci
npm run typecheck
npm run test
npm run build
npm run verify:foundation
```

Chrome `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/dist` 선택. 사람인 상세 공고를 열고 제목 옆의 **붙다 공고 정보 확인**을 누릅니다. 마감일이나 읽을 수 있는 본문이 없으면 해당 항목에 미확인이 표시됩니다.

## 문서

- [개발 지침](AGENTS.md)
- [아키텍처](docs/architecture.md)
- [사용자 흐름](docs/user-flow.md)
- [개발 계획](docs/development-plan.md)
- [기존 코드 참고 범위](docs/legacy-reference.md)
- [릴리스 노트](docs/extension-release-notes.md)
