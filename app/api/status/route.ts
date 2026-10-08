import { connect, Resources } from '@/lib/integrations/database';
import { eligibleForEvidence, type Resource } from '@/lib/integrations/contracts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Configuration presence is not a live provider test. Never return credential values.
export async function GET() {
  let database = 'not_configured';
  let resources: { provider: string; count: number }[] = [];
  if (process.env.MONGODB_URI) {
    try {
      await connect();
      const eligible = (await Resources.find({ approval: 'approved' }).lean() as unknown as Resource[]).filter(eligibleForEvidence);
      resources = [...eligible.reduce((counts, resource) => counts.set(resource.provider, (counts.get(resource.provider) ?? 0) + 1), new Map<string, number>())]
        .map(([provider, count]) => ({ provider, count }));
      database = 'connected';
    } catch { database = 'unavailable'; }
  }
  return Response.json({
    database,
    modelConfigured: !!process.env.GROQ_API_KEY?.trim(),
    ocrConfigured: !!process.env.OCR_SPACE_API_KEY?.trim(),
    quranConfigured: !!(process.env.QF_CLIENT_ID?.trim() && process.env.QF_CLIENT_SECRET?.trim()),
    quranEnvironment: process.env.QF_ENV === 'production' ? 'production' : 'prelive',
    sunnahConfigured: !!process.env.SUNNAH_API_KEY?.trim(),
    ummahConfigured: !!process.env.UMMAH_API_KEY?.trim(),
    shamelaConfigured: !!(process.env.PARSE_API_KEY?.trim() || process.env.SHAMEELA_API_KEY?.trim()),
    approvedResources: resources,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
