import 'server-only';
import { connect, Submissions, Claims, Attempts, Retrievals, Findings } from './database';
import { ClaimsError } from '../claims/validation';
import { ResearchProjects, ProjectEvidence, ResearchNotes, Briefs, Comparisons } from '../research/models';

// Invoked only by an explicit confirmed deletion request, never on a timer.
export async function deleteOwnerData(owner: string) {
  if (!/^[a-f0-9]{64}$/.test(owner)) throw new ClaimsError('Invalid session.', 403);
  await connect();
  try {
    await Promise.all([Submissions, Claims, Attempts, Retrievals, Findings, ResearchProjects, ProjectEvidence, ResearchNotes, Briefs, Comparisons].map(model => model.deleteMany({ owner })));
  } catch {
    // Keep the cookie so a partial deletion can be retried with the same owner.
    throw new ClaimsError('Deletion was not completed. Please retry.', 503, 'DELETION_UNAVAILABLE');
  }
}
