import { searchCollection } from "@/lib/search";
import { assertSameOrigin, readBody, failure } from '@/lib/claims/http';
import { ClaimsError } from '@/lib/claims/validation';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 4096)
      throw new Error("Body too large");
    const raw = new TextDecoder().decode(await readBody(request, 4096));
    if (raw.length > 4096) throw new Error("Body too large");
    const body = JSON.parse(raw);
    if (
      typeof body?.query !== "string" ||
      !body.query.trim() ||
      body.query.length > 300
    )
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Enter a query between 1 and 300 characters.",
          },
        },
        { status: 400 },
      );
    return Response.json({ results: searchCollection(body.query) });
  } catch (error) {
    if (error instanceof ClaimsError) return failure(error);
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Send a JSON object with a query.",
        },
      },
      { status: 400 },
    );
  }
}
