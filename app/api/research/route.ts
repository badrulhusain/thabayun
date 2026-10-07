import { owner } from '@/lib/integrations/owner';
import { connect, Resources } from '@/lib/integrations/database';
import { ResearchProjects } from '@/lib/research/models';
import { workspace, mutate } from '@/lib/research/service';
import { failure, jsonBody, assertSameOrigin } from '@/lib/claims/http';
import { ClaimsError, object } from '@/lib/claims/validation';
export const runtime = 'nodejs';
export const maxDuration = 60;
async function session(request: Request) {
  assertSameOrigin(request);
  if (process.env.NODE_ENV === 'production' || process.env.TABAYYUN_RESEARCH_SINGLE_USER !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) throw new ClaimsError('Research requires explicit local single-user development mode. Set TABAYYUN_RESEARCH_SINGLE_USER=true and use localhost. Account authentication is required for deployment.', 503, 'RESEARCH_AUTH_REQUIRED');
  return owner(false);
}
export async function GET(request: Request) { try { const identity = await session(request); await connect(); const projectId = new URL(request.url).searchParams.get('projectId'); return Response.json(projectId ? await workspace(identity, projectId) : { projects: await ResearchProjects.find({ owner: identity }).sort({ updatedAt: -1 }).lean(), resources: await Resources.find({ approval: 'approved' }).select('id title language').lean() }, { headers: { 'Cache-Control': 'no-store' } }); } catch (e) { return failure(e); } }
export async function POST(request: Request) { try { const identity = await session(request); const body = object(await jsonBody(request)); if (body.action === 'brief' || body.action === 'compare') await owner(); return Response.json(await mutate(identity, body, request.signal)); } catch (e) { return failure(e); } }
