import { parseSaraminPostingUrl } from '@/domain/posting';
import { readSaraminDocument } from '@/domain/saramin-detail';
import { defineContentScript } from 'wxt/utils/define-content-script';

const applyHeader = '.jv_header:has(.btn_apply > :is(button, a))';

export default defineContentScript({
  matches: [
    'https://www.saramin.co.kr/zf_user/jobs/relay/view*',
    'https://saramin.co.kr/zf_user/jobs/relay/view*',
    'https://www.saramin.co.kr/zf_user/jobs/view/*',
    'https://saramin.co.kr/zf_user/jobs/view/*',
  ],
  main(ctx) {
    const host = document.createElement('div');
    host.setAttribute('data-bootda-saramin-button', '');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: grid; justify-items: end; gap: 8px; margin: 8px 0 0; }
      button {
        box-sizing: border-box;
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        color: #334155;
        font: 600 14px system-ui, sans-serif;
        cursor: pointer;
      }
      button:hover { background: #e2e8f0; }
      button:focus-visible { outline: 2px solid #334155; outline-offset: 2px; }
      section {
        box-sizing: border-box;
        width: min(320px, 100%);
        padding: 12px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #fff;
        color: #0f172a;
        font: 14px/1.5 system-ui, sans-serif;
        overflow-wrap: anywhere;
      }
      dl, dd, p { margin: 0; }
      dt { font-weight: 600; }
      dd + dt { margin-top: 8px; }
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '붙다 · 공고 확인';
    button.setAttribute('aria-controls', 'bootda-posting-preview');
    const preview = document.createElement('section');
    preview.id = 'bootda-posting-preview';
    preview.setAttribute('aria-label', '붙다 공고 정보');
    preview.setAttribute('aria-live', 'polite');
    shadow.append(style, button, preview);

    function closePreview() {
      preview.hidden = true;
      preview.replaceChildren();
      button.setAttribute('aria-expanded', 'false');
    }
    closePreview();

    button.addEventListener('click', () => {
      if (!preview.hidden) {
        closePreview();
        return;
      }
      const details = readSaraminDocument(location.href);
      if (details) {
        const list = document.createElement('dl');
        for (const [label, value] of [
          ['회사명', details.company],
          ['공고 제목', details.title],
          ['마감일', details.deadline ?? '미확인'],
        ] as const) {
          const term = document.createElement('dt');
          const description = document.createElement('dd');
          term.textContent = label;
          description.textContent = value;
          list.append(term, description);
        }
        preview.append(list);
      } else {
        const message = document.createElement('p');
        message.textContent = '공고 정보를 찾지 못했습니다. 상세 화면이 열린 뒤 다시 시도해 주세요.';
        preview.append(message);
      }
      preview.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    });

    let postingKey: string | undefined;
    function placeButton(url: string) {
      let key: string | undefined;
      try {
        key = parseSaraminPostingUrl(url).key;
      } catch {
        // The user may have moved to a non-detail route in the same document.
      }

      const header = key ? document.querySelector(applyHeader) : null;
      if (key !== postingKey || header?.nextElementSibling !== host) closePreview();
      postingKey = key;
      if (!header) {
        host.remove();
        return;
      }
      if (header.nextElementSibling !== host) header.after(host);
    }

    placeButton(location.href);
    const observer = new MutationObserver(() => placeButton(location.href));
    observer.observe(document.body, { childList: true, subtree: true });
    ctx.addEventListener(window, 'wxt:locationchange', event => placeButton(event.newUrl.href));
    ctx.onInvalidated(() => {
      observer.disconnect();
      host.remove();
    });
  },
});
