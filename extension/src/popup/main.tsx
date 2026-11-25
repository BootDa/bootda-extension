import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return <main className="w-[320px] p-5 text-slate-900">
    <header className="flex items-center justify-between gap-2">
      <h1 className="text-xl font-bold tracking-tight">붙다</h1>
      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">개발용 0.1.0</span>
    </header>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">채용공고 확인부터 지원예정목록 정리까지.</p>
    <section className="mt-4 rounded-lg border border-slate-200 p-3" aria-label="개발 상태">
      <h2 className="text-sm font-semibold">초기 개발 환경</h2>
      <ul className="mt-2 space-y-2 text-xs text-slate-600">
        <li>사람인 공고 수집 — 준비 중</li>
        <li>잡플래닛 기업 확인 — 준비 중</li>
        <li>기술스택 분석 — 준비 중</li>
        <li>Google Sheets 연결 — 준비 중</li>
      </ul>
    </section>
    <p className="mt-3 text-xs leading-relaxed text-slate-500">현재는 초기 화면만 제공합니다. 외부 서비스로 데이터를 전송하지 않습니다.</p>
  </main>;
}
const root = document.getElementById('root');
if (!root) throw new Error('Popup root missing');
createRoot(root).render(<StrictMode><App /></StrictMode>);
