import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { Badge } from '@/components/ui/badge';
import { parseSaraminPostingUrl } from '@/domain/posting';
import { readSaraminDocument, type SaraminDetails } from '@/domain/saramin-detail';
import { version } from '../../public/manifest.json';
import './style.css';

function App() {
  const [details, setDetails] = useState<SaraminDetails | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const sourceTab = useRef<{ id: number; windowId: number } | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    const clearDetails = () => {
      revision.current++;
      setDetails(null);
      setMessage('현재 탭에서 공고를 다시 읽어 주세요.');
    };
    const onActivated = ({ tabId, windowId }: { tabId: number; windowId: number }) => {
      if (windowId === sourceTab.current?.windowId && tabId !== sourceTab.current.id) clearDetails();
    };
    const onUpdated = (tabId: number, change: { url?: string; status?: string }) => {
      if (tabId === sourceTab.current?.id && (change.url || change.status === 'loading')) clearDetails();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  async function readPosting() {
    if (pending.current) return;
    pending.current = true;
    sourceTab.current = null;
    const startedAt = revision.current;
    setBusy(true);
    setDetails(null);
    setMessage('');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined || !tab.url) {
        setMessage('사람인 채용공고 상세 페이지를 열어 주세요.');
        return;
      }
      try {
        parseSaraminPostingUrl(tab.url);
      } catch {
        setMessage('사람인 채용공고 상세 페이지를 열어 주세요.');
        return;
      }
      sourceTab.current = { id: tab.id, windowId: tab.windowId };
      const [capture] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: readSaraminDocument,
        args: [tab.url],
      });
      const [current] = await browser.tabs.query({ active: true, currentWindow: true });
      if (startedAt !== revision.current || current?.id !== tab.id || current.url !== tab.url) {
        setMessage('탭이나 공고가 바뀌었습니다. 현재 공고를 다시 읽어 주세요.');
      } else if (capture?.result) {
        setDetails(capture.result);
      } else {
        setMessage('공고 정보를 찾지 못했습니다. 상세 화면이 모두 열린 후 다시 시도해 주세요.');
      }
    } catch {
      setMessage('공고를 읽을 수 없습니다. 사람인 상세 화면에서 팝업을 다시 열어 주세요.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <main className="w-[320px] p-5 text-slate-900">
    <header className="flex items-center justify-between gap-2">
      <h1 className="text-xl font-bold tracking-tight">붙다</h1>
      <Badge variant="secondary">개발용 {version}</Badge>
    </header>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">채용공고 확인부터 지원예정목록 정리까지.</p>
    <section className="mt-4 rounded-lg border border-slate-200 p-3" aria-label="사람인 공고">
      <button type="button" onClick={readPosting} disabled={busy}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {busy ? '공고 읽는 중…' : '현재 공고 읽기'}
      </button>
      <div aria-live="polite">
        {message && <p className="mt-3 text-sm text-slate-600" role="status">{message}</p>}
        {details && <dl className="mt-3 space-y-2 break-words text-sm">
          <div><dt className="font-semibold">회사명</dt><dd>{details.company}</dd></div>
          <div><dt className="font-semibold">공고 제목</dt><dd>{details.title}</dd></div>
          <div><dt className="font-semibold">마감일</dt><dd>{details.deadline ?? '미확인'}</dd></div>
        </dl>}
      </div>
    </section>
  </main>;
}
const root = document.getElementById('root');
if (!root) throw new Error('Popup root missing');
createRoot(root).render(<StrictMode><App /></StrictMode>);
