import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { ClaimsError } from '../claims/validation';
const state = globalThis as typeof globalThis & { tabayyunMongo?: Promise<typeof mongoose> };
export async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.startsWith('mongodb+srv://')) throw new ClaimsError('Configure server-only MONGODB_URI with an Atlas connection URI.', 503, 'DATABASE_NOT_CONFIGURED');
  state.tabayyunMongo ??= mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 5000, maxPoolSize: 5 }).catch(() => { state.tabayyunMongo = undefined; throw new ClaimsError('Evidence storage is unavailable.', 503, 'DATABASE_UNAVAILABLE'); });
  return state.tabayyunMongo;
}
const required = { type: String, required: true };
const resourceSchema = new Schema({ id: required, provider: { ...required, enum: ['quran-foundation', 'sunnah', 'turath', 'parse'] }, providerId: required, type: { ...required, enum: ['arabic', 'translation', 'tafsir', 'hadith', 'book'] }, title: required, language: required, url: required, author: String, translator: String, editor: String, edition: required, approval: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, reviewer: String, reviewedAt: Date, reviewNotes: String }, { timestamps: true });
resourceSchema.index({ id: 1 }, { unique: true }); resourceSchema.index({ provider: 1, providerId: 1, language: 1, edition: 1 }, { unique: true }); resourceSchema.index({ approval: 1, provider: 1 });
const submissionSchema = new Schema({ owner: required, materialId: required, revision: Number, inputType: String, submittedText: String, extractedText: String, uploadReference: String, status: String }, { timestamps: true });
submissionSchema.index({ owner: 1, materialId: 1, revision: 1 }, { unique: true });
const claimSchema = new Schema({ owner: required, claimId: required, revision: Number, submissionId: required, claim: Schema.Types.Mixed, parsedReference: Schema.Types.Mixed }, { timestamps: true });
claimSchema.index({ owner: 1, claimId: 1, revision: 1 }, { unique: true }); claimSchema.index({ submissionId: 1 });
const evidenceSchema = new Schema({ id: required, resourceId: required, contentHash: required, language: required, edition: required, translationIdentity: String, locator: required, provider: required, originalText: required, normalizedText: required, sourceUrl: required, author: String, context: String, grades: [{ authority: String, grade: String }], limitations: [String], retrievedAt: Date });
evidenceSchema.index({ id: 1 }, { unique: true }); evidenceSchema.index({ resourceId: 1, edition: 1, language: 1, translationIdentity: 1, locator: 1, contentHash: 1 }, { unique: true });
evidenceSchema.add({ structuredLocator: Schema.Types.Mixed });
const retrievalSchema = new Schema({ owner: required, claimId: required, claimRevision: Number, run: Schema.Types.Mixed }, { timestamps: true }); retrievalSchema.index({ owner: 1, claimId: 1, claimRevision: 1, createdAt: -1 });
const findingSchema = new Schema({ owner: required, claimId: required, evidenceIds: [String], outcome: String, explanation: String, limitations: [String], analyzedAt: Date, model: String, promptVersion: String, analysis: Schema.Types.Mixed }); findingSchema.index({ owner: 1, claimId: 1, analyzedAt: -1 });
const attemptSchema = new Schema({ owner: required, claimId: required, provider: required, lookupType: String, reference: String, durationMs: Number, attempts: Number, outcome: { type: String, enum: ['success', 'no_match', 'unavailable', 'error', 'unsupported', 'not_configured'] } }, { timestamps: true }); attemptSchema.index({ owner: 1, claimId: 1, createdAt: -1 });
function model(name: string, schema: Schema) { return mongoose.models[name] || mongoose.model(name, schema, name); }
export const Resources = model('resources', resourceSchema), Submissions = model('submissions', submissionSchema), Claims = model('claims', claimSchema), EvidenceRecords = model('evidence', evidenceSchema), Findings = model('findings', findingSchema), Attempts = model('retrievalAttempts', attemptSchema), Retrievals = model('retrievals', retrievalSchema);
