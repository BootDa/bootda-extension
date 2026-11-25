import { parseSaraminPostingUrl } from '../domain/posting';
import { readSaraminPosting, saraminDetailId, saraminHeader } from './saramin-posting';

const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'closed' });
const style = document.createElement('style');
style.textContent = `
  :host { display: block; margin: 12px 0; color: #172033; font: 14px/1.5 system-ui, sans-serif; }
  button { border: 0; border-radius: 8px; background: #244abc; color: white; cursor: pointer; padding: 8px 13px; font: inherit; font-weight: 600; }
  dl { margin: 10px 0; padding: 12px; border: 1px solid #d8e0ed; border-radius: 8px; background: white; }
  dt { font-weight: 600; }
  dd { margin: 0 0 6px; overflow-wrap: anywhere; }
  p { margin: 8px 0; }
`;
const button = document.createElement('button');
button.type = 'button';
button.textContent = '붙다 공고 정보 확인';
const result = document.createElement('div');
result.setAttribute('aria-live', 'polite');
shadow.append(style, button, result);

let key: string | null = null;
let activeHeader: Element | null = null;
let previousHeader: Element | null = null;

function synchronize(): boolean {
  let currentKey: string | null = null;
  try {
    currentKey = parseSaraminPostingUrl(location.href).key;
  } catch {
    // A navigation may leave the posting routes entirely.
  }
  if (currentKey !== key) {
    previousHeader = activeHeader ?? previousHeader;
    key = currentKey;
    activeHeader = null;
    result.replaceChildren();
    host.remove();
  }

  const header = key ? saraminHeader(document, key) : null;
  const id = header && saraminDetailId(header);
  const matchingId = id && key === 'saramin:' + id;
  if (!key || !header || (id && !matchingId) || (header === previousHeader && !matchingId)) {
    host.remove();
    return false;
  }

  if (activeHeader !== header) {
    result.replaceChildren();
    activeHeader = header;
  }
  if (host.parentElement !== header) header.append(host);
  return true;
}

button.addEventListener('click', () => {
  if (!synchronize()) return;
  const capture = readSaraminPosting(document, location.href);
  if (!capture) {
    result.textContent = '공고 정보를 확인할 수 없습니다. 상세 페이지가 열린 뒤 다시 시도해 주세요.';
    return;
  }

  const fields = document.createElement('dl');
  for (const [label, value] of [
    ['기업명', capture.posting.company],
    ['공고명', capture.posting.title],
    ['마감일', capture.posting.deadline ?? '미확인'],
    ['공고 ID', capture.posting.key.slice('saramin:'.length)],
    ['원문 URL', capture.posting.url],
    ['본문 텍스트', capture.text ? `${capture.text.length}자 확인` : '미확인'],
  ]) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    fields.append(term, detail);
  }
  result.replaceChildren(fields);
});

synchronize();
new MutationObserver(synchronize).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-rec_idx', 'data-rec-idx'],
});
window.addEventListener('popstate', synchronize);
(window as Window & { navigation?: EventTarget }).navigation?.addEventListener('currententrychange', synchronize);
