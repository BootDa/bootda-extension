import { parseSaraminPostingUrl } from '@/domain/posting';
import { defineContentScript } from 'wxt/utils/define-content-script';

const hostSelector = '[data-bootda-saramin-button]';
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
      :host { display: flex; justify-content: flex-end; margin: 8px 0 0; }
      button {
        box-sizing: border-box;
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        color: #334155;
        font: 600 14px system-ui, sans-serif;
        cursor: default;
      }
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '붙다';
    button.disabled = true;
    button.title = '공고 확인 기능 준비 중';
    shadow.append(style, button);

    function placeButton(url: string) {
      try {
        parseSaraminPostingUrl(url);
      } catch {
        host.remove();
        return;
      }

      const header = document.querySelector(applyHeader);
      if (!header) {
        host.remove();
        return;
      }
      if (header.nextElementSibling?.matches(hostSelector)) return;
      header.after(host);
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
