import { test, expect } from "@playwright/test";
test("research persists across refresh; citations and notes remain intact", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.getByLabel("Title", { exact: true }).fill("Evidence and patience");
  await page
    .getByLabel("Research question", { exact: true })
    .fill("What passages discuss patience?");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evidence and patience", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Paste or edit text")
    .fill("A passage I want to investigate.");
  await page
    .getByRole("button", { name: "Save material", exact: true })
    .click();
  await expect(
    page.getByText("Research material saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Research text", exact: true })
    .fill("My corrected material.");
  await page.getByRole("button", { name: "Save edits", exact: true }).click();
  await expect(
    page.getByText("Material changes saved.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search query").fill("seek aid with patience");
  await page.getByRole("button", { name: "Search collection" }).click();
  await page.getByRole("button", { name: "Inspect passage" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Read original source" }),
  ).toHaveAttribute("href", /wikisource.org/);
  await dialog
    .getByRole("textbox", { name: "Personal note", exact: true })
    .fill("Useful for further reading.");
  await dialog.getByRole("button", { name: "Save evidence" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Personal note", exact: true })
    .fill("Updated personal note.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByText("Personal note saved.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-workspace.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Research text", exact: true }),
  ).toHaveValue("My corrected material.");
  await expect(
    page.getByRole("textbox", { name: "Personal note", exact: true }),
  ).toHaveValue("Updated personal note.");
  await page.getByLabel("Search query").fill("patience");
  await page.getByRole("button", { name: "Search collection" }).click();
  await page.getByRole("button", { name: "Inspect passage" }).click();
  await expect(
    page.getByRole("button", { name: "Already saved" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect passage" }),
  ).toBeFocused();
  await page.getByLabel("Search query").fill("quantum computing");
  await page.getByRole("button", { name: "Search collection" }).click();
  await expect(
    page.getByRole("heading", {
      name: "No matching passages in this collection",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All projects" }).click();
  await expect(
    page.getByRole("link", { name: "Evidence and patience" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept("Renamed project"));
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Renamed project" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Renamed project" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your first question belongs here." }),
  ).toBeVisible();
  const counts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("tabayyun-research", 4);
      r.onsuccess = () => resolve(r.result);
    });
    return Promise.all(
      ["materials", "evidence"].map(
        (name) =>
          new Promise<number>((resolve) => {
            const r = db.transaction(name).objectStore(name).count();
            r.onsuccess = () => resolve(r.result);
          }),
      ),
    );
  });
  expect(counts).toEqual([0, 0]);
});
test("screenshot validation, OCR failure, and narrow layout", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/projects");
  await page.getByLabel("Title", { exact: true }).fill("Screenshot research");
  await page
    .getByLabel("Research question", { exact: true })
    .fill("Review this image");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("button", { name: "Screenshot", exact: true }).click();
  const input = page.getByLabel("Screenshot", { exact: true });
  await input.setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert").first()).toContainText(
    "Choose a JPEG, PNG, or WebP",
  );
  await input.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(1000001),
  });
  await expect(page.getByRole("alert").first()).toContainText("under 1 MB");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  await input.setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByAltText("Selected screenshot for text extraction"),
  ).toBeVisible();
  await page.route("**/api/ocr", route => route.fulfill({ status: 503, json: { error: { message: "OCR is not configured. Test fixture failure." } } }));
  await page.getByRole("button", { name: "Extract / retry OCR" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "OCR is not configured",
  );
  await expect(
    page.getByRole("button", { name: "Save material", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Remove screenshot" }).click();
  await expect(
    page.getByAltText("Selected screenshot for text extraction"),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByLabel("Paste or edit text").fill("Pasted text still works.");
  await page
    .getByRole("button", { name: "Save material", exact: true })
    .click();
  await expect(
    page.getByText("Research material saved.", { exact: true }),
  ).toBeVisible();
  expect(
    (await request.post("/api/search", { data: { query: "" } })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/ocr", {
        multipart: {
          file: {
            name: "fake.png",
            mimeType: "image/png",
            buffer: Buffer.from("fake"),
          },
        },
      })
    ).status(),
  ).toBe(400);
  await page.screenshot({
    path: "test-results/mobile-workspace.png",
    fullPage: true,
  });
  await page.goto("/sources");
  await expect(
    page.getByRole("heading", { name: "Local demonstration library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open original source" }),
  ).toHaveAttribute("href", /wikisource.org/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
