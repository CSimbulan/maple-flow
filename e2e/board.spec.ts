import { expect, test, type Locator, type Page } from "@playwright/test";

/** Drag `from` onto `to`; `atY` is where on the target to drop, 0 = top edge, 0.5 = middle. */
async function drag(page: Page, from: Locator, to: Locator, atY = 0.5) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // dnd-kit starts dragging after the pointer moves a few pixels; move in steps like a person.
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * atY, { steps: 15 });
  // Let dnd-kit settle the sort before dropping.
  await page.waitForTimeout(150);
  await page.mouse.up();
}

const cardsIn = (page: Page, list: string) =>
  page.getByLabel(`List ${list}`, { exact: true }).getByTestId("card");

test("create a board, add cards, and drag them between lists", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  await expect(page).toHaveURL(/\/boards$/);

  await page.getByText("Create new board").click();
  await page.getByLabel("Board title").fill("E2E board");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/b\/[0-9a-f]{24}$/);

  const todo = page.getByLabel("List To do", { exact: true });
  await todo.getByRole("button", { name: "Add a card" }).click();
  for (const title of ["First", "Second", "Third"]) {
    await page.getByLabel("Enter a title for this card").fill(title);
    await page.keyboard.press("Enter");
    await expect(todo.getByLabel(`Card ${title}`, { exact: true })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(cardsIn(page, "To do")).toHaveText(["First", "Second", "Third"]);

  // Across lists: Second into the empty Doing list.
  await drag(
    page,
    page.getByLabel("Card Second", { exact: true }),
    page.getByLabel("List Doing", { exact: true }),
  );
  await expect(cardsIn(page, "Doing")).toHaveText(["Second"]);
  await expect(cardsIn(page, "To do")).toHaveText(["First", "Third"]);

  // Within a list: Third above First.
  await drag(
    page,
    page.getByLabel("Card Third", { exact: true }),
    page.getByLabel("Card First", { exact: true }),
    0.15,
  );
  await expect(cardsIn(page, "To do")).toHaveText(["Third", "First"]);

  // The order is saved on the server.
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(cardsIn(page, "To do")).toHaveText(["Third", "First"]);
  await expect(cardsIn(page, "Doing")).toHaveText(["Second"]);
});
