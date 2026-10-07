import { ClaimsError } from "./validation";
export async function jsonBody(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin && !allowedExtension(request)) throw new ClaimsError("Cross-origin requests are not allowed.", 403);
  if (Number(request.headers.get("content-length")) > 150000) throw new ClaimsError("Request too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ClaimsError("Send a JSON request.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length;
    if (size > 150000) { await reader.cancel(); throw new ClaimsError("Request too large.", 413); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ClaimsError("Send valid JSON."); }
}
function allowedExtension(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const url = new URL(request.url);
  return ['localhost','127.0.0.1'].includes(url.hostname) && process.env.NODE_ENV !== 'production' && /^chrome-extension:\/\/[a-p]{32}$/.test(origin) && origin === process.env.TABAYYUN_EXTENSION_ORIGIN;
}
export function extensionPreflight(request: Request) {
  if (!allowedExtension(request)) return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':request.headers.get('origin')!, 'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Request-ID','Access-Control-Max-Age':'600','Vary':'Origin'}});
}
export function extensionResponse(request: Request, response: Response) {
  if (allowedExtension(request)) { response.headers.set('Access-Control-Allow-Origin',request.headers.get('origin')!); response.headers.set('Access-Control-Expose-Headers','Retry-After'); response.headers.set('Vary','Origin'); }
  return response;
}
export function failure(error: unknown) {
  return Response.json({ error: { code: error instanceof ClaimsError ? error.code : "INVALID_OUTPUT", message: error instanceof ClaimsError ? error.message : "The request could not be completed. No finding saved; retry.", ...(error instanceof ClaimsError && error.telemetry ? { telemetry: error.telemetry } : {}) } }, { status: error instanceof ClaimsError ? error.status : 422, headers: error instanceof ClaimsError && error.retryAfter ? { "Retry-After": error.retryAfter } : {} });
}
