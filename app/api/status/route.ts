import { connect, Resources } from '@/lib/integrations/database';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Configuration presence is not a live provider test. Never return credential values.
export async function GET() {
  let database = 'not_configured';
  let resources: { provider: string; count: number }[] = [];
  if (process.env.MONGODB_URI) {
    try {
      await connect();
      resources = await Resources.aggregate([
        { $match: { approval: 'approved' } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $project: { _id: 0, provider: '$_id', count: 1 } },
      ]);
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
    approvedResources: resources,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
