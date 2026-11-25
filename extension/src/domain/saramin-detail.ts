export type SaraminDetails = {
  company: string;
  title: string;
  deadline: string | null;
};

// Chrome serializes this function when it runs it in the active tab.
export function readSaraminDocument(expectedUrl: string): SaraminDetails | null {
  if (location.href !== expectedUrl) return null;
  const text = (element: Element | null) =>
    element?.textContent?.replace(/\s+/g, ' ').trim() || null;

  const header = document.querySelector('.wrap_jv_header > .jv_header')
    ?? document.querySelector('.jv_header:not(.jv_header_float .jv_header)');
  const company = text(header?.querySelector('.company') ?? null);
  const title = text(header?.querySelector('h1.tit_job') ?? null);
  let deadline: string | null = null;

  for (const label of document.querySelectorAll('.jv_howto .info_period dt')) {
    if (!['마감일', '접수마감', '접수 마감'].includes(text(label) ?? '')) continue;
    const value = label.nextElementSibling;
    if (value?.matches('dd')) deadline = text(value);
    if (deadline) break;
  }

  return company && title ? { company, title, deadline } : null;
}
