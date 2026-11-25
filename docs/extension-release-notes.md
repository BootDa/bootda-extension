# Extension release notes

## 0.2.0 — 사람인 공고 미리보기 (미출시)

- 사람인 상세 공고에서 회사명, 공고 제목, 마감일을 읽어 팝업에 표시합니다.
- 공고에서 마감일을 확인할 수 없으면 미확인으로 표시합니다.
- 팝업에서 요청한 현재 탭만 읽을 수 있도록 `activeTab`과 `scripting` 권한을 사용합니다.

## 0.1.1 — 확장 빌드 환경 전환 (미출시)

- pnpm으로 의존성을 고정하고 WXT로 Chrome Manifest V3 팝업을 빌드합니다.
- 기존 React 팝업 상태 표시에 Tailwind CSS v4 기반 shadcn/ui Badge를 적용했습니다.
- 빌드에서 생성된 manifest의 버전, 권한 및 팝업 경로를 검증합니다.

## 0.1.0 — 개발용 초기 기반 (미출시)

- React + TypeScript + Vite 팝업 초기 화면.
- Manifest V3 및 공고 식별/기술스택 검증 모델.
- 제품 아키텍처와 단계별 계획 문서.
- 외부 API, 수집 및 저장 기능은 미구현.
