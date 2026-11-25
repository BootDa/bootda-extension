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

test('Chrome keeps one inline button when Saramin replaces the posting header', async () => {
  const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
  try {
    await browser.installExtension(fileURLToPath(build));
    const tab = await browser.newPage();
    await tab.setRequestInterception(true);
    const applyMarkup = '<div class="btn_apply"><button type="button">입사지원</button></div>';
    const header = fixtureHeader.replace('</div>', `${applyMarkup}</div>`);
    tab.on('request', request => request.url() === fixtureUrl
      ? request.respond({ contentType: 'text/html; charset=utf-8', body: header })
      : request.abort());
    await tab.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
    await expectOneInlineButton(tab);

    await tab.evaluate(nextHeader => {
      history.pushState(null, '', '?rec_idx=456');
      const currentHeader = document.querySelector('.jv_header');
      if (currentHeader) currentHeader.outerHTML = nextHeader;
    }, header.replace('예시 회사', '두 번째 회사'));
    expect(new URL(tab.url()).searchParams.get('rec_idx')).toBe('456');
    expect(await tab.$eval('.jv_header .company', element => element.textContent)).toContain('두 번째 회사');
    await expectOneInlineButton(tab);

    await tab.evaluate(() => history.pushState(null, '', '/zf_user/jobs/public/list'));
    await tab.waitForSelector(inlineButton, { hidden: true, timeout: 5_000 });
    expect(await tab.$$(inlineButton)).toHaveLength(0);
  } finally {
    await browser.close();
  }
}, 30_000);

test.skipIf(process.env.BOOTDA_TEST_LIVE_SARAMIN !== '1')(
  'Chrome shows one inline button per real posting when navigating in the same tab',
  async () => {
    const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
    try {
      await browser.installExtension(fileURLToPath(build));
      const tab = await browser.newPage();
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
      const image = new URL('saramin-inline-button.png', screenshot);
      await mkdir(new URL('./', image), { recursive: true });
      const clip = await tab.$eval(inlineButton, host => {
        const row = host.getBoundingClientRect();
        const header = host.previousElementSibling!.getBoundingClientRect();
        return { x: header.x, y: header.y, width: header.width, height: row.bottom - header.y };
      });
      await tab.screenshot({ path: fileURLToPath(image), clip });
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
  })).toEqual({ text: '붙다', disabled: true });
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

async function verifyPostingPopup(url: string, html: string | null, expected: string[] | null, nextId?: string) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', build), 'utf8'));
  const browser = await puppeteer.launch({ headless: false, enableExtensions: true });
  try {
    const extensionId = await browser.installExtension(fileURLToPath(build));
    const extension = (await browser.extensions()).get(extensionId);
    if (!extension) throw new Error('Chrome did not load the unpacked extension');

    const tab = await browser.newPage();
    if (html !== null) {
      const fixture = `<section class="jview jview-0-123"><div class="wrap_jv_header">${html.replace('class="jv_header"', 'class="jv_header" data-rec_idx="123"')}</div></section>`;
      await tab.setRequestInterception(true);
      tab.on('request', request => request.url() === url
        ? request.respond({ contentType: 'text/html; charset=utf-8', body: fixture })
        : request.abort());
    }
    await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    if (nextId) await tab.evaluate(id => history.pushState(null, '', `?rec_idx=${id}`), nextId);
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
