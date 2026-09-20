import { test, expect } from "@playwright/test";
test("touch selection, live editor and rotation in mobile WebKit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Display Fold", exact: true }).tap();
  await expect(page.getByTestId("clock")).toHaveAttribute(
    "data-aspect",
    "landscape",
  );
  await expect(page.getByLabel("Customize clock")).toBeVisible();
  await page
    .getByRole("button", { name: "Background Haze", exact: true })
    .tap();
  await page.getByTestId("display-stage").tap();
  await expect(page.getByLabel("Customize clock")).toHaveCount(0);
  await expect(page.getByTestId("clock")).toHaveAttribute(
    "data-aspect",
    "portrait",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId("clock")).toHaveAttribute(
    "data-aspect",
    "landscape",
  );
  await page.getByRole("button", { name: "Edit clock", exact: true }).tap();
  await expect(page.getByLabel("Customize clock")).toBeVisible();
  await page.screenshot({
    path: "case-study-captures/qa/mobile-webkit-landscape-editor.png",
  });
});
