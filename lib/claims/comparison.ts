import type { Claim, RetrievalRun, AnalysisRun } from "../types";
import { exactText, referenceMatches } from "./retrieval";
export function compare(claim: Claim, run: RetrievalRun): Pick<AnalysisRun, "quotation" | "reference"> {
  const exact = run.passages.filter(p => claim.quotation && exactText(p.text).includes(exactText(claim.quotation)));
  const cited = run.passages.filter(p => referenceMatches(claim.reference, p));
  const quotation: AnalysisRun["quotation"] = !claim.quotation ? "Not applicable" : exact.length ? "Exact match" :
    cited.length ? "Wording differs" : run.passages.length ? "Uncertain" : "Not located";
  const reference: AnalysisRun["reference"] = !claim.reference ? "Not supplied" : !cited.length ? "Not located" :
    !claim.quotation ? "Uncertain" : cited.some(p => exact.includes(p)) ? "Resolved and matches the cited passage" :
    "Resolved but mismatched";
  return { quotation, reference };
}
