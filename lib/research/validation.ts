import { ClaimsError, object, string } from '../claims/validation';
import type { Statement } from './types';
export const briefSections = ['Research question and scope', 'Main findings', 'Differences in interpretation', 'Limitations and unanswered questions'];
export const comparisonSections = ['Explicit statements', 'Overlap', 'Scope and interpretation', 'Disagreement and sufficiency', 'Uncertainties'];
export function ids(value: unknown, max = 8): string[] {
  if (!Array.isArray(value) || value.length > max) throw new ClaimsError(`Select at most ${max} passages.`);
  const result = value.map(v => string(v, 150));
  if (new Set(result).size !== result.length) throw new ClaimsError('Duplicate evidence selection.');
  return result;
}
export function statements(value: unknown, selected: string[], sections: string[]): Statement[] {
  if (!selected.length) throw new ClaimsError('Select evidence before generating a sourced document.', 422);
  if (!Array.isArray(value) || !value.length || value.length > 30) throw new ClaimsError('Malformed structured output.', 422);
  const parsed = value.map(item => {
    const row = object(item), evidenceIds = ids(row.evidenceIds);
    if (!evidenceIds.length || evidenceIds.some(id => !selected.includes(id))) throw new ClaimsError('Invalid or missing citation. Document was not saved.', 422);
    const section = string(row.section, 100);
    if (!sections.includes(section)) throw new ClaimsError('Invalid document section.', 422);
    return { section, text: string(row.text, 4000), evidenceIds, review: 'needs-review' as const };
  });
  if (sections.some(s => !parsed.some(p => p.section === s))) throw new ClaimsError('Required sections missing.', 422);
  if (JSON.stringify(parsed).length > 40000) throw new ClaimsError('Document too large.', 422);
  return parsed;
}
