export type SaraminDetails = {
  company: string;
  title: string;
  deadline: string | null;
};

// Chrome serializes this function when it runs it in the active tab.
export function readSaraminDocument(expectedUrl: string, root?: ParentNode): SaraminDetails | null {
  if (location.href !== expectedUrl) return null;
  if (!root) {
    const url = new URL(expectedUrl);
    const id = url.pathname === '/zf_user/jobs/relay/view'
      ? url.searchParams.get('rec_idx')
      : /\/zf_user\/jobs\/view\/(\d+)\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^\d+$/.test(id)) return null;
    const header = document.querySelector(`.wrap_jv_header > .jv_header[data-rec_idx="${id}"]`);
    root = header?.closest('.jview') ?? undefined;
    if (!root) return null;
  }
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
