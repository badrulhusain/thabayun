import { test, expect } from "@playwright/test";

test("OCR review requires confirmation and preserves corrections", async ({
  page,
}) => {
  // This tests UI state with a mocked endpoint; it does not verify the OCR provider.
  let ocrRequest = "";
  await page.route("**/api/ocr", (route) => {
    ocrRequest = route.request().postData() ?? "";
    return route.fulfill({ json: { text: "Extracted original text" } });
  });
  await page.goto("/projects");
  await page.getByLabel("Title", { exact: true }).fill("OCR review");
  await page
    .getByLabel("Research question", { exact: true })
    .fill("Inspect text");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("button", { name: "Screenshot", exact: true }).click();
  await page.getByLabel("Screenshot", { exact: true }).setInputFiles({
    name: "image.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByLabel("OCR language")).toHaveValue("ara");
  await page.getByRole("button", { name: "Extract / retry OCR" }).click();
  expect(ocrRequest).toContain('name="language"');
  expect(ocrRequest).toContain("ara");
  const editor = page.getByRole("textbox", {
    name: "Review and edit extracted text",
    exact: true,
  });
  await expect(editor).toHaveValue("Extracted original text");
  await expect(
    page.getByRole("button", { name: "Save material", exact: true }),
  ).toBeDisabled();
  await editor.fill("My corrected extraction");
  await page.getByRole("checkbox").check();
  await editor.fill("My final correction");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save material", exact: true })
    .click();
  await expect(page.getByText("Research material saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Research text", exact: true }),
  ).toHaveValue("My final correction");
  await page.getByText("Original text", { exact: true }).click();
  await expect(
    page.getByText("Extracted original text", { exact: true }),
  ).toBeVisible();
});

test("storage failure is visible and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      value: {
        open: () => {
          throw new Error("Storage disabled for test");
        },
      },
    });
  });
  await page.goto("/projects");
  await expect(page.getByRole("alert").first()).toContainText(
    "Storage disabled",
  );
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Storage disabled",
  );
});
