import { extractText, type OCRLanguage } from "@/lib/ocr";
import { assertSameOrigin, readBody, failure } from '@/lib/claims/http';
import { owner } from '@/lib/integrations/owner';
import { ClaimsError } from '@/lib/claims/validation';
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 1100000)
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Screenshot must be under 1 MB.",
          },
        },
        { status: 400 },
      );
    const bytesBody = await readBody(request, 1100000);
    const form = await new Response(bytesBody, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
    const file = form.get("file");
    const requestedLanguage = form.get("language");
    const language: OCRLanguage =
      requestedLanguage === "eng" || requestedLanguage === "auto"
        ? requestedLanguage
        : "ara";
    if (
      !(file instanceof File) ||
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 1000000 ||
      file.size === 0
    )
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message:
              "Send a JPEG or PNG under 1 MB. WebP is converted to PNG in the browser.",
          },
        },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const valid =
      file.type === "image/png"
        ? bytes[0] === 137 &&
          bytes[1] === 80 &&
          bytes[2] === 78 &&
          bytes[3] === 71
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid)
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "File contents do not match the image type.",
          },
        },
        { status: 400 },
      );
    await owner();
    return Response.json({ text: await extractText(file, language) });
  } catch (error) {
    if (error instanceof ClaimsError) return failure(error);
    return Response.json(
      {
        error: {
          code: "OCR_UNAVAILABLE",
          message:
            'OCR failed. Please retry or paste the text.',
        },
      },
      { status: 503 },
    );
  }
}
