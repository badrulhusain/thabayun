import type { Claim, RetrievalRun, AnalysisRun } from "../types";
import { exactText, referenceMatches } from "./retrieval";
export function comparedQuotation(claim: Claim, run: RetrievalRun) {
  return claim.quotation || run.queries.find(query => query.method === "exact-quotation")?.query || "";
}
export function compare(claim: Claim, run: RetrievalRun): Pick<AnalysisRun, "quotation" | "reference"> {
  const quotationText = comparedQuotation(claim, run);
  const exact = run.passages.filter(p => quotationText && exactText(p.text).includes(exactText(quotationText)));
  const cited = run.passages.filter(p => referenceMatches(claim.reference, p));
  const quotation: AnalysisRun["quotation"] = !quotationText ? "Not applicable" : exact.length ? "Exact match" :
    cited.length ? "Wording differs" : run.passages.length ? "Uncertain" : "Not located";
  const reference: AnalysisRun["reference"] = !claim.reference ? "Not supplied" : !cited.length ? "Not located" :
    !quotationText ? "Uncertain" : cited.some(p => exact.includes(p)) ? "Resolved and matches the cited passage" :
    "Resolved but mismatched";
  return { quotation, reference };
}
