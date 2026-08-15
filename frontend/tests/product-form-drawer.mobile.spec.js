import fs from "node:fs";
import path from "node:path";
import { test, expect, devices } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

const chainSelectors = [
  ".catalog-form-drawer-mobile .ant-drawer-content-wrapper",
  ".catalog-form-drawer-mobile .ant-drawer-content",
  ".catalog-form-drawer-mobile .ant-drawer-wrapper-body",
  ".catalog-form-drawer-mobile .ant-drawer-body",
  ".catalog-modal-shell",
  ".catalog-modal-layout",
  ".catalog-modal-main",
  ".catalog-modal-main-scroll"
];

function artifactPath(...parts) {
  const outputDir = path.join(process.cwd(), "test-artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  return path.join(outputDir, ...parts);
}

async function collectScrollMetrics(page) {
  return page.evaluate((selectors) => {
    return Object.fromEntries(
      selectors.map((selector) => {
        const node = document.querySelector(selector);
        const styles = node ? window.getComputedStyle(node) : null;
        const rect = node?.getBoundingClientRect?.();
        return [
          selector,
          node
            ? {
                clientHeight: node.clientHeight,
                scrollHeight: node.scrollHeight,
                scrollTop: node.scrollTop,
                overflowY: styles?.overflowY,
                height: styles?.height,
                minHeight: styles?.minHeight,
                maxHeight: styles?.maxHeight,
                top: rect?.top,
                bottom: rect?.bottom
              }
            : null
        ];
      })
    );
  }, chainSelectors);
}

async function openMobileContext(browser, viewport) {
  return browser.newContext({
    ...devices["iPhone 12"],
    viewport,
    screen: viewport,
    isMobile: true,
    hasTouch: true
  });
}

test.describe("mobile Product form drawer", () => {
  for (const viewport of viewports) {
    test(`keeps a single working scroll owner at ${viewport.width}x${viewport.height}`, async ({ browser, browserName }) => {
      const context = await openMobileContext(browser, viewport);
      const page = await context.newPage();

      await page.goto("/debug/product-form-drawer?mode=add&step=1&open=1");
      await expect(page.locator(".catalog-modal-header")).toBeVisible();
      await expect(page.locator(".catalog-modal-footer")).toBeVisible();

      const scrollRegion = page.locator(".catalog-modal-main-scroll");
      await expect(scrollRegion).toBeVisible();

      const metrics = await collectScrollMetrics(page);
      const scrollOwner = metrics[".catalog-modal-main-scroll"];

      expect(scrollOwner.clientHeight).toBeGreaterThan(0);
      expect(scrollOwner.scrollHeight).toBeGreaterThan(scrollOwner.clientHeight);
      expect(scrollOwner.overflowY).toBe("auto");

      const internalScrollOwners = Object.entries(metrics)
        .filter(([, value]) => value && ["auto", "scroll"].includes(value.overflowY) && value.scrollHeight > value.clientHeight + 1)
        .map(([selector]) => selector);

      expect(internalScrollOwners).toEqual([".catalog-modal-main-scroll"]);

      const scrollMutation = await scrollRegion.evaluate((node) => {
        node.scrollTop = 0;
        const before = node.scrollTop;
        node.scrollTop = node.scrollHeight;
        return {
          before,
          after: node.scrollTop
        };
      });

      expect(scrollMutation.after).toBeGreaterThan(scrollMutation.before);

      await page.goto("/debug/product-form-drawer?mode=add&step=3&open=1");
      const detailScrollRegion = page.locator(".catalog-modal-main-scroll");
      const detailMetrics = await detailScrollRegion.evaluate((node) => ({
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight
      }));

      expect(detailMetrics.scrollHeight).toBeGreaterThan(detailMetrics.clientHeight);

      await context.close();
      test.info().annotations.push({ type: "browser", description: browserName });
    });
  }

  test("preserves focused field visibility and restores background page scrolling", async ({ browser, browserName }) => {
    const context = await openMobileContext(browser, { width: 390, height: 844 });
    const page = await context.newPage();

    await page.goto("/debug/product-form-drawer?mode=add&step=1&open=1");

    const scrollRegion = page.locator(".catalog-modal-main-scroll");
    await scrollRegion.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const inputs = page.locator(".catalog-form-stage input");
    await inputs.last().focus();
    await page.setViewportSize({ width: 390, height: 560 });

    const focusBounds = await page.evaluate(() => {
      const container = document.querySelector(".catalog-modal-main-scroll");
      const target = document.activeElement;
      if (!(container instanceof HTMLElement) || !(target instanceof HTMLElement)) {
        return null;
      }

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      return {
        containerTop: containerRect.top,
        containerBottom: containerRect.bottom,
        targetTop: targetRect.top,
        targetBottom: targetRect.bottom
      };
    });

    expect(focusBounds).not.toBeNull();
    expect(focusBounds.targetTop).toBeGreaterThanOrEqual(focusBounds.containerTop);
    expect(focusBounds.targetBottom).toBeLessThanOrEqual(focusBounds.containerBottom);

    if (browserName === "chromium") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/debug/product-form-drawer?mode=add&step=1&open=1");
      await page.screenshot({ path: artifactPath("product-form-pricing-top-390x844.png"), fullPage: false });

      await scrollRegion.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await page.screenshot({ path: artifactPath("product-form-pricing-bottom-390x844.png"), fullPage: false });

      await inputs.last().focus();
      await page.setViewportSize({ width: 390, height: 560 });
      await page.screenshot({ path: artifactPath("product-form-pricing-focus-keyboard-390x844.png"), fullPage: false });
    }

    await page.goto("/debug/product-form-drawer?mode=add&step=1&open=1");
    await page.locator(".catalog-modal-back").click();
    await expect(page.locator(".catalog-modal-main-scroll")).toBeHidden();

    const pageScroll = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollTo({ top: 1200, behavior: "auto" });
      return {
        before,
        after: window.scrollY
      };
    });

    expect(pageScroll.after).toBeGreaterThan(pageScroll.before);

    await context.close();
  });
});
