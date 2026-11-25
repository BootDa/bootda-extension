export type SaraminDetails = {
  company: string;
  title: string;
  deadline: string | null;
};

// Chrome serializes this function when it runs it in the active tab.
export function readSaraminDocument(expectedUrl: string, source: 'root'): Element | null;
export function readSaraminDocument(expectedUrl: string, source: Element): SaraminDetails | null;
export function readSaraminDocument(expectedUrl: string): SaraminDetails | null;
export function readSaraminDocument(expectedUrl: string, source?: Element | 'root'): SaraminDetails | Element | null {
  if (source !== 'root' && location.href !== expectedUrl) return null;
  let root = typeof source === 'string' ? undefined : source;
  if (!root) {
    const url = new URL(expectedUrl);
    const id = url.pathname === '/zf_user/jobs/relay/view'
      ? url.searchParams.get('rec_idx')
      : /\/zf_user\/jobs\/view\/(\d+)\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^\d+$/.test(id)) return null;
    const sequence = new URLSearchParams(url.hash.slice(1)).get('seq') ?? '0';
    if (!/^\d+$/.test(sequence)) return null;
    const entry = document.querySelector(`.jview.jview-0-${id}`);
    if (!entry) return null;
    if (sequence === '0') {
      root = entry;
    } else {
      const identity = new RegExp(`^jview-${sequence}-\\d+$`);
      for (let section = entry.nextElementSibling; section; section = section.nextElementSibling) {
        if (!section.classList.contains('jview')) continue;
        const names = Array.from(section.classList);
        if (names.some(name => /^jview-0-\d+$/.test(name))) break;
        if (names.some(name => identity.test(name))) {
          root = section;
          break;
        }
      }
    }
    if (!root) return null;
  }
  if (source === 'root') return root;
  const text = (element: Element | null) =>
    element?.textContent?.replace(/\s+/g, ' ').trim() || null;

  const header = root.querySelector('.wrap_jv_header > .jv_header')
    ?? root.querySelector('.jv_header:not(.jv_header_float .jv_header)');
  const company = text(header?.querySelector('.company') ?? null);
  const title = text(header?.querySelector('h1.tit_job') ?? null);
  let deadline: string | null = null;

  for (const label of root.querySelectorAll('.jv_howto .info_period dt')) {
    if (!['마감일', '접수마감', '접수 마감'].includes(text(label) ?? '')) continue;
    const value = label.nextElementSibling;
    if (value?.matches('dd')) deadline = text(value);
    if (deadline) break;
  }

  return company && title ? { company, title, deadline } : null;
}
