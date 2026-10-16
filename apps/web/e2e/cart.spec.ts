import { expect, test, type Page } from "@playwright/test";

// Seeded products: the lamp has variants + bulk tiers, the charger a single variant
const BULK_PRODUCT = "/product/rechargeable-360-magnetic-led-wall-lamp/";
const SINGLE_PRODUCT = "/product/65w-gan-fast-charger/";

const productName = (page: Page) => page.getByRole("heading", { level: 1 }).innerText();

/** The phone-pinned order bar (the md+ copy in the flow is hidden at this width) */
const orderBar = (page: Page) =>
  page.locator("div.fixed").filter({ has: page.getByRole("button", { name: "Order now" }) });

/** The page must not be wider than the phone: horizontal overflow zooms it out and hides the fixed order bar. */
async function expectNoHorizontalOverflow(page: Page) {
  const { innerWidth, scrollWidth } = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(innerWidth).toBe(390);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** The checkout order summary lists the product with its quantity. */
async function expectCheckoutLine(page: Page, name: string, quantity: number) {
  await expect(page).toHaveURL(/\/checkout\/?$/);
  const summary = page.getByRole("region", { name: "Order summary" });
  await expect(summary.getByRole("listitem").filter({ hasText: name })).toContainText(
    `× ${quantity}`,
  );
}

test("add 2 pieces to cart and check out, then order now on another product", async ({ page }) => {
  let lamp = "";

  await test.step("product page: 2 pieces → Add to cart opens the drawer with qty 2", async () => {
    await page.goto(BULK_PRODUCT);
    await expectNoHorizontalOverflow(page);
    lamp = await productName(page);

    await page.getByRole("radio", { name: /\b2 pieces\b/ }).click();
    const bar = orderBar(page);
    await expect(bar).toContainText("2 pieces");
    await expect(bar).toBeInViewport();
    await bar.getByRole("button", { name: "Add to cart" }).click();

    // Upsell offers (when the product has any) come first; "View cart" opens the drawer
    const drawer = page.getByRole("dialog", { name: /Your cart/ });
    const offers = page.getByRole("dialog", { name: /Added to cart/ });
    await expect(drawer.or(offers)).toBeVisible();
    if (await offers.isVisible()) await offers.getByRole("button", { name: /View cart/ }).click();

    await expect(drawer).toBeVisible();
    const line = drawer.getByRole("listitem").filter({ hasText: lamp });
    await expect(line.locator("[aria-live=polite]")).toHaveText("2");
    await expect(page.getByRole("button", { name: "Cart, 2 items" })).toBeAttached();

    await drawer.getByRole("link", { name: /^Checkout/ }).click();
    await expectCheckoutLine(page, lamp, 2);
  });

  await test.step("another product: Order now goes straight to checkout with it", async () => {
    await page.goto(SINGLE_PRODUCT);
    await expectNoHorizontalOverflow(page);
    const charger = await productName(page);

    const bar = orderBar(page);
    await expect(bar).toBeInViewport();
    await bar.getByRole("button", { name: "Order now" }).click();

    await expectCheckoutLine(page, charger, 1);
    await expectCheckoutLine(page, lamp, 2); // the earlier cart is kept
    await expect(page.getByRole("dialog", { name: /Your cart|Added to cart/ })).toBeHidden();
  });
});
