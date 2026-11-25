const labels = ['경력', '급여', '학력', '근무일시', '근무형태', '근무지역', '우대사항'] as const;

function inlineText(element: Element) {
  return element.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function readSaraminPreview(root: Element) {
  const values = new Map<string, string>();
  for (const term of root.querySelectorAll('.jv_summary dt')) {
    const label = inlineText(term);
    const description = term.nextElementSibling;
    if (!labels.some(field => field === label) || !description?.matches('dd')) continue;

    if (label === '우대사항') {
      const preferred = Array.from(description.querySelectorAll('.toolTipTxt li'), item => {
        const value = item.cloneNode(true) as Element;
        value.querySelector('span')?.remove();
        return inlineText(value);
      }).filter(Boolean);
      if (preferred.length) {
        values.set(label, preferred.join(', '));
        continue;
      }
    }
    const value = description.cloneNode(true) as Element;
    value.querySelectorAll('button, .toolTipWrap, .blind').forEach(node => node.remove());
    const text = inlineText(value);
    if (text && !(label === '우대사항' && /^\d+건$/.test(text))) values.set(label, text);
  }

  const detail = root.querySelector('.jv_detail');
  const frame = detail?.querySelector<HTMLIFrameElement>('iframe[id^="iframe_content"]');
  const body = frame
    ? frame.contentDocument?.body
    : detail?.querySelector<HTMLElement>('.cont');
  return {
    fields: labels.map(label => [label, values.get(label) ?? '미확인'] as const),
    body: body?.innerText.trim() || null,
  };
}
