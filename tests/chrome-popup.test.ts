import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { expect, test } from 'vitest';
import { version } from '../package.json';

const build = new URL('../extension/dist/chrome-mv3/', import.meta.url);
const screenshot = new URL('../coverage/chrome-popup.png', import.meta.url);

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
