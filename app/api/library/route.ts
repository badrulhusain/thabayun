import { requireAccount } from '@/lib/auth/session';
import { connect, SourceBooks, SourcePassages } from '@/lib/integrations/database';
import { searchLocalBook } from '@/lib/integrations/local-books';
import { failure, assertSameOrigin } from '@/lib/claims/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    assertSameOrigin(request); await requireAccount(); await connect();
    const url = new URL(request.url), query = (url.searchParams.get('q') ?? '').trim(), passageId = url.searchParams.get('passage');
    if (passageId) {
      const passage = await SourcePassages.findOne({ id: passageId }).lean();
      if (!passage) return Response.json({ error: 'Passage not found.' }, { status: 404 });
      const book = await SourceBooks.findOne({ id: passage.bookId }).lean();
      return Response.json({ book, passages: [passage], preview: book?.approval !== 'approved' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const result = query ? await searchLocalBook(query, { includePending: true, limit: 20 }) : { books: await SourceBooks.find({}).lean(), passages: [] };
    return Response.json({ ...result, preview: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}