import "server-only";
export type OCRLanguage = "ara" | "eng" | "auto";

export async function extractText(file: File, language: OCRLanguage = "ara") {
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key)
    throw new Error(
      "OCR is not configured. Set OCR_SPACE_API_KEY on the server. Pasted text remains available.",
    );
  const form = new FormData();
  form.set("file", file);
  form.set("language", language);
  // Engine 3 supports Arabic and is the provider's highest-accuracy engine.
  form.set("OCREngine", language === "eng" ? "2" : "3");
  form.set("isOverlayRequired", "false");
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: key },
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw new Error("OCR provider is unavailable. Please retry.");
  const data = await response.json();
  if (data.IsErroredOnProcessing || Number(data.OCRExitCode) !== 1)
    throw new Error(
      "OCR could not read this image. Try a clearer screenshot or paste the text.",
    );
  const text = (data.ParsedResults ?? [])
    .map((p: { ParsedText?: string }) => p.ParsedText ?? "")
    .join("\n")
    .trim();
  if (!text)
    throw new Error(
      "No text was found. Try another screenshot or paste the text.",
    );
  if (text.length > 100000)
    throw new Error("Extracted text is too long. Use a smaller screenshot.");
  return text;
}
