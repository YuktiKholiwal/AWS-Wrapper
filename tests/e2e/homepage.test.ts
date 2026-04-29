import { test, expect } from "@playwright/test";

test("homepage loads and displays Plot heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Plot" })).toBeVisible();
});
