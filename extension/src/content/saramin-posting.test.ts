// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=12345" }
import { expect, test, vi } from 'vitest';
import fixture from './fixtures/saramin-detail.html?raw';
import { readSaraminPosting } from './saramin-posting';

const url = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=12345';

function detail(): Document {
  return new DOMParser().parseFromString(fixture, 'text/html');
}

test('extracts the posting and strips tracking from its URL', () => {
  expect(readSaraminPosting(detail(), url + '&utm_source=example')).toEqual({
    posting: {
      key: 'saramin:12345',
      source: 'saramin',
      company: '예시 기업',
      title: '프론트엔드 개발자',
      deadline: '2026.12.31',
      url,
    },
    text: '웹 서비스 개발 및 유지보수',
  });
});

test('reads the same posting from the canonical query URL', () => {
  const canonical = 'https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=12345';
  expect(readSaraminPosting(detail(), canonical)?.posting.url).toBe(url);
});

test('preserves the posting when a deadline or readable text is unavailable', () => {
  const doc = detail();
  doc.querySelector('.jv_howto')?.remove();
  doc.querySelector('.user_content')!.innerHTML = '<img alt="공고 이미지">';
  expect(readSaraminPosting(doc, url)).toMatchObject({ posting: { deadline: null }, text: '' });
});

test('rejects unrelated pages and stale detail markup', () => {
  expect(readSaraminPosting(detail(), 'https://example.com/')).toBeNull();
  expect(readSaraminPosting(detail(), url.replace('12345', '67890'))).toBeNull();
  expect(readSaraminPosting(document, url)).toBeNull();
});

test('uses matching structured data when the DOM omits fields', () => {
  const doc = detail();
  doc.querySelector('.company')?.remove();
  doc.querySelector('.jv_howto')?.remove();
  doc.querySelector('.jv_detail')?.remove();
  const script = doc.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({ '@graph': [
    { '@type': 'JobPosting', url: url.replace('12345', '67890'), hiringOrganization: { name: '다른 기업' } },
    {
      '@type': 'JobPosting', url, hiringOrganization: { name: '예시 기업' },
      validThrough: '2026-12-31', description: '<p>테스트 본문</p><script>ignored()</script>',
    },
  ] });
  doc.head.append(script);
  expect(readSaraminPosting(doc, url)).toMatchObject({
    posting: { company: '예시 기업', deadline: '2026-12-31' },
    text: '테스트 본문',
  });
});

test('clears the preview during an in-page move to another posting', async () => {
  document.body.innerHTML = fixture;
  const hosts: ShadowRoot[] = [];
  const observers: MutationObserver[] = [];
  vi.stubGlobal('MutationObserver', class extends MutationObserver {
    constructor(callback: MutationCallback) {
      super(callback);
      observers.push(this);
    }
  });
  const originalAttach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (options) {
    const shadow = originalAttach.call(this, options);
    hosts.push(shadow);
    return shadow;
  };
  try {
    await import('./saramin');
    expect(hosts).toHaveLength(1);
    const [shadow] = hosts;
    shadow.querySelector('button')!.click();
    expect(shadow.textContent).toContain('프론트엔드 개발자');

    history.pushState(null, '', '/zf_user/jobs/relay/view?rec_idx=67890');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(shadow.host.isConnected).toBe(false);
    expect(shadow.textContent).not.toContain('프론트엔드 개발자');

    document.body.innerHTML = fixture.replace('12345', '67890').replace('프론트엔드 개발자', '백엔드 개발자');
    await Promise.resolve();
    expect(shadow.host.isConnected).toBe(true);
    shadow.querySelector('button')!.click();
    expect(shadow.textContent).toContain('백엔드 개발자');
    expect(shadow.textContent).toContain('67890');
  } finally {
    observers.forEach(observer => observer.disconnect());
    vi.unstubAllGlobals();
    Element.prototype.attachShadow = originalAttach;
  }
});
