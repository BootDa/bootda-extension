import { parseSaraminPostingUrl } from '@/domain/posting';
import { readSaraminDocument } from '@/domain/saramin-detail';
import { readSaraminPreview } from '@/domain/saramin-preview';
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
      :host { position: relative; z-index: 2; display: grid; justify-items: end; margin: 8px 0 0; }
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
        position: absolute;
        inset-block-start: calc(100% + 8px);
        inset-inline-end: 0;
        box-sizing: border-box;
        width: min(320px, 100%);
        padding: 12px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #fff;
        color: #0f172a;
        font: 14px/1.5 system-ui, sans-serif;
        overflow-wrap: anywhere;
        max-height: min(55vh, 480px);
        overflow: auto;
      }
      dl, dd, p { margin: 0; }
      dt { font-weight: 600; }
      dd + dt { margin-top: 8px; }
      details { margin-top: 12px; }
      summary { cursor: pointer; font-weight: 600; }
      details p { white-space: pre-wrap; margin-top: 8px; }
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

    let postingRoot: Element | null = null;
    let displayed = '';
    function closePreview() {
      displayed = '';
      preview.hidden = true;
      preview.replaceChildren();
      button.setAttribute('aria-expanded', 'false');
    }
    closePreview();

    button.addEventListener('click', () => {
      placeButton(location.href);
      if (!host.isConnected) return;
      if (!preview.hidden) {
        closePreview();
        return;
      }
      preview.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      refreshPreview();
    });

    function refreshPreview() {
      if (preview.hidden || !postingRoot) return;
      const details = readSaraminDocument(location.href, postingRoot);
      const extra = details ? readSaraminPreview(postingRoot) : null;
      const snapshot = JSON.stringify([details, extra]);
      if (snapshot === displayed) return;
      displayed = snapshot;
      const bodyWasOpen = preview.querySelector('details')?.open ?? false;
      preview.replaceChildren();
      if (details && extra) {
        const list = document.createElement('dl');
        for (const [label, value] of [
          ['회사명', details.company],
          ['공고 제목', details.title],
          ['마감일', details.deadline ?? '미확인'],
          ...extra.fields,
        ] as const) {
          const term = document.createElement('dt');
          const description = document.createElement('dd');
          term.textContent = label;
          description.textContent = value;
          list.append(term, description);
        }
        const body = document.createElement('details');
        body.open = bodyWasOpen;
        const heading = document.createElement('summary');
        heading.textContent = '공고 본문';
        const text = document.createElement('p');
        text.textContent = extra.body ?? '확인할 수 있는 텍스트 본문이 없습니다.';
        body.append(heading, text);
        preview.append(list, body);
      } else {
        const message = document.createElement('p');
        message.textContent = '공고 정보를 찾지 못했습니다. 상세 화면이 열린 뒤 다시 시도해 주세요.';
        preview.append(message);
      }
    }

    let postingKey: string | undefined;
    let originalHeader: Element | null = null;
    function placeButton(url: string) {
      let key: string | undefined;
      try {
        key = parseSaraminPostingUrl(url).key;
      } catch {
        // The user may have moved to a non-detail route in the same document.
      }

      const root = key ? readSaraminDocument(url, 'root') : null;
      const original = root?.querySelector(`.wrap_jv_header > ${applyHeader}`) ?? null;
      if (key !== postingKey || root !== postingRoot || original !== originalHeader) closePreview();
      postingKey = key;
      postingRoot = root;
      originalHeader = original;
      if (!original) {
        host.remove();
        return;
      }

      const sequence = new URLSearchParams(new URL(url).hash.slice(1)).get('seq') ?? '0';
      const id = original.getAttribute('data-rec_idx') ?? key?.slice('saramin:'.length) ?? '';
      const floating = document.querySelector(`.jv_header_float > ${applyHeader}[data-rec_idx="${CSS.escape(id)}"][data-rec_seq="${sequence}"]`);
      const bounds = floating?.getBoundingClientRect();
      const header = floating && bounds && bounds.width > 0 && bounds.height > 0
        && bounds.bottom > 0 && bounds.top < window.innerHeight
        && getComputedStyle(floating).visibility === 'visible'
        ? floating
        : original;
      if (header.nextElementSibling !== host) {
        const restoreFocus = shadow.activeElement === button;
        header.after(host);
        if (restoreFocus) button.focus({ preventScroll: true });
      }
    }

    placeButton(location.href);
    let frame: number | undefined;
    let refreshPending = false;
    function schedulePlacement() {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        placeButton(location.href);
        if (refreshPending) {
          refreshPending = false;
          refreshPreview();
        }
      });
    }
    function scheduleRefresh() {
      refreshPending = true;
      schedulePlacement();
    }
    const observer = new MutationObserver(records => {
      if (postingRoot && records.some(record => postingRoot?.contains(record.target))) {
        scheduleRefresh();
      } else {
        schedulePlacement();
      }
    });
    observer.observe(document.body, {
      childList: true, characterData: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'data-rec_idx'],
    });
    ctx.addEventListener(window, 'scroll', schedulePlacement, { passive: true });
    ctx.addEventListener(window, 'resize', schedulePlacement);
    ctx.addEventListener(document, 'load', event => {
      if (event.target instanceof HTMLIFrameElement && postingRoot?.contains(event.target)) scheduleRefresh();
    }, { capture: true });
    ctx.addEventListener(window, 'wxt:locationchange', event => placeButton(event.newUrl.href));
    ctx.onInvalidated(() => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      host.remove();
    });
  },
});
