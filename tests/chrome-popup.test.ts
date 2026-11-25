import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Page } from 'puppeteer';
import { expect, test } from 'vitest';
import { version } from '../package.json';

const build = new URL('../extension/dist/chrome-mv3/', import.meta.url);
const screenshot = new URL('../coverage/chrome-popup.png', import.meta.url);

const fixtureUrl = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123';
const fixtureHeader = '<div class="jv_header"><a class="company"> 예시 회사 </a><h1 class="tit_job">웹 개발자   채용</h1></div>';
const fixturePeriod = '<section class="jv_cont jv_howto"><dl class="info_period"><dt>시작일</dt><dd>2026.11.20 09:00</dd><dt class="end">마감일</dt><dd>2026.11.30 18:00</dd></dl></section>';
const inlineButton = '[data-bootda-saramin-button]';

test('Chrome refreshes a late deadline and hides the previous posting during navigation', async () => {
  const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
  try {
    await browser.installExtension(fileURLToPath(build));
    const tab = await browser.newPage();
    await tab.setRequestInterception(true);
    const applyMarkup = '<div class="btn_apply"><button type="button">입사지원</button></div>';
    const header = fixtureHeader.replace('</div>', `${applyMarkup}</div>`);
    const posting = (id: number, markup: string, sequence = 0) =>
      `<section class="jview jview-${sequence}-${id}"><div class="wrap_jv_header">${markup}</div></section>`;
    tab.on('request', request => request.url() === fixtureUrl
      ? request.respond({ contentType: 'text/html; charset=utf-8', body: posting(123, header) })
      : request.abort());
    await tab.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
    await expectOneInlineButton(tab);
    const fields = ['예시 회사', '웹 개발자 채용', '미확인'];
    await expectInlinePreview(tab, fields);
    await tab.evaluate(floatingHeader => {
      document.body.insertAdjacentHTML('afterbegin',
        `<div class="jv_header_float" style="position: fixed; inset: 0 0 auto">${floatingHeader}</div>`);
    }, header.replace('class="jv_header"', 'class="jv_header" data-rec_idx="123" data-rec_seq="0"').replace('예시 회사', '고정 헤더 회사'));
    await tab.waitForSelector(`.jv_header_float > .jv_header + ${inlineButton}`, { timeout: 5_000 });
    await expectOneInlineButton(tab);
    await expectOpenPreview(tab, fields);
    await tab.click(`${inlineButton} >>> button`);
    await expectInlinePreview(tab, fields);

    await tab.evaluate(() => document.querySelector('.jv_header_float')?.remove());
    await tab.waitForSelector(`.wrap_jv_header > .jv_header + ${inlineButton}`, { timeout: 5_000 });
    await expectOneInlineButton(tab);
    await expectOpenPreview(tab, fields);

    await tab.evaluate(period => document.querySelector('.jview')?.insertAdjacentHTML('beforeend', period), fixturePeriod);
    await tab.waitForFunction((selector, value) =>
      document.querySelector(selector)?.shadowRoot?.querySelectorAll('dd')[2]?.textContent === value,
    { timeout: 5_000 }, inlineButton, '2026.11.30 18:00');
    await expectOpenPreview(tab, ['예시 회사', '웹 개발자 채용', '2026.11.30 18:00']);

    await tab.evaluate(() => history.replaceState(null, '', '#seq=1'));
    await tab.waitForSelector(inlineButton, { hidden: true, timeout: 5_000 });
    await tab.evaluate(related => document.body.insertAdjacentHTML('beforeend', related),
      posting(789, header.replace('예시 회사', '추천 회사').replace('웹 개발자   채용', '추천 공고'), 1));
    await tab.waitForSelector(`.jview-1-789 ${inlineButton}`, { timeout: 5_000 });
    await expectOneInlineButton(tab);
    expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelector('section')?.hidden)).toBe(true);
    await expectInlinePreview(tab, ['추천 회사', '추천 공고', '미확인']);
    await tab.evaluate(() => history.replaceState(null, '', '#seq=0'));
    await tab.waitForSelector(`.jview-0-123 ${inlineButton}`, { timeout: 5_000 });
    await expectInlinePreview(tab, ['예시 회사', '웹 개발자 채용', '2026.11.30 18:00']);

    await tab.evaluate(() => history.pushState(null, '', '?rec_idx=456'));
    expect(new URL(tab.url()).searchParams.get('rec_idx')).toBe('456');
    await tab.waitForSelector(inlineButton, { hidden: true, timeout: 5_000 });
    expect(await tab.$eval('.jview-0-123 .company', element => element.textContent)).toContain('예시 회사');
    await tab.evaluate((nextPosting, oldHeader) => {
      document.body.insertAdjacentHTML('beforeend', nextPosting);
      document.body.insertAdjacentHTML('afterbegin',
        `<div class="jv_header_float" style="position: fixed; inset: 0 0 auto">${oldHeader}</div>`);
    }, posting(456, header.replace('예시 회사', '두 번째 회사')),
    header.replace('class="jv_header"', 'class="jv_header" data-rec_idx="123" data-rec_seq="0"'));
    expect(await tab.$eval('.jview-0-456 .company', element => element.textContent)).toContain('두 번째 회사');
    await expectOneInlineButton(tab);
    expect(await tab.$eval(inlineButton, host => Boolean(host.closest('.jview-0-456')))).toBe(true);
    await tab.evaluate(() => document.querySelector('.jv_header_float')?.remove());
    expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelector('section')?.hidden)).toBe(true);
    await expectInlinePreview(tab, ['두 번째 회사', '웹 개발자 채용', '미확인']);
    await tab.click(`${inlineButton} >>> button`);
    expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelector('section')?.hidden)).toBe(true);

    await tab.evaluate(() => history.pushState(null, '', '/zf_user/jobs/public/list'));
    await tab.waitForSelector(inlineButton, { hidden: true, timeout: 5_000 });
    expect(await tab.$$(inlineButton)).toHaveLength(0);
  } finally {
    await browser.close();
  }
}, 30_000);

test.skipIf(process.env.BOOTDA_TEST_LIVE_SARAMIN !== '1')(
  'Chrome keeps one inline button and its open preview across real Saramin headers',
  async () => {
    const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
    try {
      await browser.installExtension(fileURLToPath(build));
      const tab = await browser.newPage();
      await tab.setViewport({ width: 1200, height: 900 });
      for (const [id, company] of [['55644102', '삼신테크'], ['55617351', '호서대학교'], ['55644102', '삼신테크']]) {
        await tab.goto(`https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}&view_type=etc`, {
          waitUntil: 'domcontentloaded', timeout: 20_000,
        });
        await expectOneInlineButton(tab);
        expect(await tab.$eval('.jv_header .company', element => element.textContent)).toContain(company);
        const bounds = await tab.$eval(inlineButton, host => {
          const apply = host.previousElementSibling?.querySelector('.btn_apply > button')?.getBoundingClientRect();
          const button = host.shadowRoot?.querySelector('button')?.getBoundingClientRect();
          if (!apply || !button) throw new Error('Missing application or Bootda button');
          return { gap: button.top - apply.bottom, rightOffset: Math.abs(button.right - apply.right) };
        });
        expect(bounds.gap).toBeGreaterThanOrEqual(0);
        expect(bounds.gap).toBeLessThanOrEqual(32);
        expect(bounds.rightOffset).toBeLessThanOrEqual(2);
      }
      await tab.waitForSelector('.jv_howto .info_period .end', { timeout: 12_000 });
      const fields = [
        '삼신테크',
        '[강남역/주6일/오전4시간] 삼성전자 조간 스크랩 업무 채용',
        '2026.11.30 08:00',
      ];
      await expectInlinePreview(tab, fields);
      const originalHost = await tab.$(`.wrap_jv_header > .jv_header + ${inlineButton}`);
      if (!originalHost) throw new Error('Missing original preview host');

      await tab.evaluate(() => window.scrollTo(0, 850));
      await expectMovedPreview('.jv_header_float');
      const image = new URL('saramin-floating-preview.png', screenshot);
      await mkdir(new URL('./', image), { recursive: true });
      const preview = await tab.$(`${inlineButton} >>> section`);
      if (!preview) throw new Error('Missing inline preview');
      await preview.screenshot({ path: fileURLToPath(image) });

      await tab.evaluate(() => window.scrollTo(0, 0));
      await expectMovedPreview('.wrap_jv_header');

      await tab.waitForFunction(selector =>
        document.querySelector(selector)?.shadowRoot?.querySelector('details p')?.textContent?.includes('모집부문'),
      { timeout: 8_000 }, inlineButton);
      const extra = await tab.$eval(inlineButton, host => {
        const root = host.shadowRoot!;
        return Array.from(root.querySelectorAll('dd')).slice(3).map(field => field.textContent);
      });
      expect(extra).toEqual([
        '경력무관(신입포함)', '월급 240 만원 (주 40시간)', '학력무관(예정자 가능)',
        '주 6일(월~토) 04:30~08:30', '계약직, 파견직', '서울 서초구',
        '인근거주자, 해당직무 근무경험, 문서작성 우수자',
      ]);
      const summary = `${inlineButton} >>> summary`;
      await tab.click(summary);
      await tab.waitForSelector(`${inlineButton} >>> details[open] p`, { visible: true, timeout: 5_000 });

      await tab.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await tab.waitForSelector('.jview[class*="jview-1-"] .wrap_jv_header .jv_header', { timeout: 15_000 });
      await tab.$eval('.jview[class*="jview-1-"] .wrap_jv_header .jv_header', header => {
        window.scrollBy(0, header.getBoundingClientRect().top + 700);
      });
      await tab.waitForFunction(() => location.hash === '#seq=1', { timeout: 10_000 });
      await tab.waitForSelector(`.jv_header_float > .jv_header[data-rec_seq="1"] + ${inlineButton}`, { timeout: 8_000 });
      await expectOneInlineButton(tab);
      expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelector('section')?.hidden)).toBe(true);
      await tab.click(`${inlineButton} >>> button`);
      await tab.waitForSelector(`${inlineButton} >>> section:not([hidden]) dd`, { timeout: 5_000 });
      const activeTitle = await tab.$eval('.jview[class*="jview-1-"] .wrap_jv_header .tit_job', title =>
        title.textContent?.replace(/\s+/g, ' ').trim());
      expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelectorAll('dd')[1]?.textContent))
        .toBe(activeTitle);
      expect(activeTitle).not.toBe(fields[1]);
      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.waitForSelector(`.jview-0-55644102 .wrap_jv_header ${inlineButton}`, { timeout: 8_000 });
      await expectOneInlineButton(tab);
      expect(await tab.$eval(inlineButton, host => host.shadowRoot?.querySelector('section')?.hidden)).toBe(true);

      async function expectMovedPreview(wrapper: string) {
        const selector = `${wrapper} > .jv_header + ${inlineButton}`;
        await tab.waitForSelector(selector, { visible: true, timeout: 8_000 });
        expect(await tab.$$(inlineButton)).toHaveLength(1);
        expect(await tab.$eval(selector, (host, initial) => host === initial, originalHost)).toBe(true);
        await expectOpenPreview(tab, fields);
        const visible = await tab.$eval(selector, host => {
          const button = host.shadowRoot?.querySelector('button');
          const preview = host.shadowRoot?.querySelector('section');
          return [button, preview].every(element => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= innerHeight
              && document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === host;
          });
        });
        expect(visible).toBe(true);
      }
    } finally {
      await browser.close();
    }
  },
  90_000,
);

async function expectOneInlineButton(tab: Page) {
  await tab.waitForSelector(`.jv_header + ${inlineButton}`, { visible: true, timeout: 12_000 });
  expect(await tab.$$(inlineButton)).toHaveLength(1);
  expect(await tab.$eval(inlineButton, host => {
    const button = host.shadowRoot?.querySelector('button');
    return { text: button?.textContent, disabled: button?.disabled };
  })).toEqual({ text: '붙다 · 공고 확인', disabled: false });
}

async function expectInlinePreview(tab: Page, values: string[]) {
  const before = tab.url();
  await tab.click(`${inlineButton} >>> button`);
  await tab.waitForSelector(`${inlineButton} >>> section:not([hidden])`, { visible: true, timeout: 5_000 });
  expect(tab.url()).toBe(before);
  await expectOpenPreview(tab, values);
}

async function expectOpenPreview(tab: Page, values: string[]) {
  expect(await tab.$eval(inlineButton, host => {
    const root = host.shadowRoot;
    return {
      expanded: root?.querySelector('button')?.getAttribute('aria-expanded'),
      labels: Array.from(root?.querySelectorAll('dt') ?? [], element => element.textContent),
      values: Array.from(root?.querySelectorAll('dd') ?? [], element => element.textContent).slice(0, 3),
    };
  })).toEqual({
    expanded: 'true',
    labels: ['회사명', '공고 제목', '마감일', '경력', '급여', '학력', '근무일시', '근무형태', '근무지역', '우대사항'],
    values,
  });
}

test.each([
  { name: 'dated posting', url: fixtureUrl, html: fixtureHeader + fixturePeriod,
    expected: ['예시 회사', '웹 개발자 채용', '2026.11.30 18:00'] },
  { name: 'posting without deadline', url: fixtureUrl, html: fixtureHeader,
    expected: ['예시 회사', '웹 개발자 채용', '미확인'] },
  { name: 'unsupported page', url: 'https://www.saramin.co.kr/zf_user/jobs/public/list', html: fixtureHeader,
    expected: null },
])('Chrome previews a Saramin $name', async ({ url, html, expected }) => {
  await verifyPostingPopup(url, html, expected);
}, 45_000);

test.skipIf(process.env.BOOTDA_TEST_LIVE_SARAMIN !== '1')(
  'Chrome previews the public Saramin posting 55644102',
  async () => {
    await verifyPostingPopup(
      'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=55644102&view_type=etc',
      null,
      ['삼신테크', '[강남역/주6일/오전4시간] 삼성전자 조간 스크랩 업무 채용', '2026.11.30 08:00'],
    );
  },
  55_000,
);

test('Chrome popup rejects a previous posting after the URL changes', async () => {
  await verifyPostingPopup(fixtureUrl, fixtureHeader + fixturePeriod, null, '456');
}, 45_000);

test('Chrome popup uses the current recommendation instead of the entry posting', async () => {
  const related = fixtureHeader.replace('예시 회사', '추천 회사').replace('웹 개발자   채용', '추천 공고');
  await verifyPostingPopup(fixtureUrl, fixtureHeader + fixturePeriod, ['추천 회사', '추천 공고', '미확인'], undefined, related);
}, 45_000);

async function verifyPostingPopup(url: string, html: string | null, expected: string[] | null, nextId?: string, related?: string) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', build), 'utf8'));
  const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
  try {
    const extensionId = await browser.installExtension(fileURLToPath(build));
    const extension = (await browser.extensions()).get(extensionId);
    if (!extension) throw new Error('Chrome did not load the unpacked extension');

    const tab = await browser.newPage();
    if (html !== null) {
      const first = `<section class="jview jview-0-123"><div class="wrap_jv_header">${html.replace('class="jv_header"', 'class="jv_header" data-rec_idx="123"')}</div></section>`;
      const fixture = related
        ? `${first}<section class="jview jview-1-789"><div class="wrap_jv_header">${related}</div></section>`
        : first;
      await tab.setRequestInterception(true);
      tab.on('request', request => request.url() === url
        ? request.respond({ contentType: 'text/html; charset=utf-8', body: fixture })
        : request.abort());
    }
    await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    if (nextId) await tab.evaluate(id => history.pushState(null, '', `?rec_idx=${id}`), nextId);
    if (related) await tab.evaluate(() => history.replaceState(null, '', '#seq=1'));
    if (html === null) await tab.waitForSelector('.jv_howto .info_period .end', { timeout: 12_000 });
    await tab.bringToFront();
    await tab.triggerExtensionAction(extension);
    const popupUrl = `chrome-extension://${extensionId}/${manifest.action.default_popup}`;
    const target = await browser.waitForTarget(candidate => candidate.url() === popupUrl, { timeout: 5_000 });
    const popup = await target.asPage();
    await popup.waitForSelector('button', { visible: true, timeout: 5_000 });
    await popup.click('button');

    if (expected === null) {
      await popup.waitForSelector('[role="status"]', { visible: true, timeout: 5_000 });
      expect(await popup.$eval('[role="status"]', element => element.textContent))
        .toBe(nextId
          ? '공고 정보를 찾지 못했습니다. 상세 화면이 모두 열린 후 다시 시도해 주세요.'
          : '사람인 채용공고 상세 페이지를 열어 주세요.');
      expect(await popup.$('dl')).toBeNull();
    } else {
      await popup.waitForSelector('dl dd', { visible: true, timeout: 5_000 });
      expect(await popup.$$eval('dl dd', fields => fields.map(field => field.textContent))).toEqual(expected);
    }

    if (html === null) {
      const liveScreenshot = new URL('saramin-popup.png', screenshot);
      await mkdir(new URL('./', liveScreenshot), { recursive: true });
      await popup.screenshot({ path: fileURLToPath(liveScreenshot) });
    }
  } finally {
    await browser.close();
  }
}

test('Chrome opens the extension popup with a styled version badge', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', build), 'utf8'));
  const browser = await puppeteer.launch({ headless: false, enableExtensions: true });

  try {
    const extensionId = await browser.installExtension(fileURLToPath(build));
    const extension = (await browser.extensions()).get(extensionId);
    if (!extension) throw new Error('Chrome did not load the unpacked extension');
    expect(extension.version).toBe(version);

    const tab = await browser.newPage();
    await tab.bringToFront();
    await tab.triggerExtensionAction(extension);
    const popupUrl = `chrome-extension://${extensionId}/${manifest.action.default_popup}`;
    const target = await browser.waitForTarget(candidate => candidate.url() === popupUrl, { timeout: 5_000 });
    const popup = await target.asPage();

    const badgeSelector = '[data-slot="badge"][data-variant="secondary"]';
    await popup.waitForSelector(badgeSelector, { visible: true, timeout: 5_000 });
    const badge = await popup.$eval(badgeSelector, element => {
      const style = getComputedStyle(element);
      return {
        text: element.textContent?.trim(),
        display: style.display,
        background: style.backgroundColor,
        foreground: style.color,
        radius: Number.parseFloat(style.borderTopLeftRadius),
        padding: style.paddingInlineStart,
      };
    });

    expect(badge.text).toBe(`개발용 ${version}`);
    // Chrome computes inline-flex as flex for a child of the flex header.
    expect(badge.display).toBe('flex');
    expect(badge.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(badge.foreground).not.toBe(badge.background);
    expect(badge.radius).toBeGreaterThan(8);
    expect(badge.padding).toBe('8px');
    expect(await popup.$eval('main', element => element.getBoundingClientRect().width)).toBe(320);
    expect(await popup.$eval('h1', element => element.textContent?.trim())).toBe('붙다');

    await mkdir(new URL('./', screenshot), { recursive: true });
    await popup.screenshot({ path: fileURLToPath(screenshot) });
    console.info(await browser.version());
  } finally {
    await browser.close();
  }
}, 45_000);
