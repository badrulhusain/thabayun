import { claimTypes, supportResults } from "../types";
const text = { type: "string" };
export function schemaObject(properties: Record<string, unknown>) { return { type: "object", properties, required: Object.keys(properties), additionalProperties: false }; }
export const extractionSchema = schemaObject({ claims: { type: "array", maxItems: 20, items: schemaObject({
  excerpt: text, start: { type: "integer" }, end: { type: "integer" }, statement: text,
  type: { type: "string", enum: claimTypes }, quotation: text, speaker: text, reference: text,
}) } });
export const analysisSchema = schemaObject({ support: { type: "string", enum: supportResults }, quotationRelationship: { type: "string", enum: ["Possible paraphrase", "Uncertain", "Not applicable"] }, explanation: text,
  evidence: { type: "array", maxItems: 8, items: schemaObject({ passageId: text, excerpt: text,
    relation: { type: "string", enum: ["supporting", "conflicting", "contextual"] }, directConflict: { type: "boolean" } }) },
  limitations: { type: "array", items: text, maxItems: 10 }, unresolvedQuestions: { type: "array", items: text, maxItems: 10 }, nextStep: text,
});
