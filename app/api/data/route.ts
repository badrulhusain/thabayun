import { cookies } from 'next/headers';
import { failure, jsonBody } from '@/lib/claims/http';
import { ClaimsError, object } from '@/lib/claims/validation';
import { deleteOwnerData } from '@/lib/integrations/data';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = object(await jsonBody(request));
    if (body.confirm !== true) throw new ClaimsError('Confirm deletion before continuing.');
    const jar = await cookies();
    const id = jar.get('tabayyun-owner')?.value;
    if (id) await deleteOwnerData(id);
    jar.delete('tabayyun-owner');
    return Response.json({ deleted: true });
  } catch (error) { return failure(error); }
}
