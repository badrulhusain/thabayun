import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { ClaimsError } from '../claims/validation';
const state = globalThis as typeof globalThis & { tabayyunMongo?: Promise<typeof mongoose> };
async function dnsOverHttps(name: string, type: 'SRV' | 'TXT') {
  const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`DNS-over-HTTPS returned ${response.status}`);
  const payload = await response.json() as { Status?: number; Answer?: { data?: unknown }[] };
  if (payload.Status !== 0 || !Array.isArray(payload.Answer)) throw new Error(`DNS-over-HTTPS returned status ${payload.Status}`);
  return payload.Answer.map(answer => String(answer.data ?? ''));
}
async function directAtlasUri(srvUri: string) {
  const parsed = new URL(srvUri);
  const srv = await dnsOverHttps(`_mongodb._tcp.${parsed.hostname}`, 'SRV');
  const hosts = srv.map(record => record.trim().split(/\s+/).at(-1)?.replace(/\.$/, '')).filter((host): host is string => !!host);
  if (!hosts.length) throw new Error('Atlas SRV lookup returned no hosts');
  const txt = await dnsOverHttps(parsed.hostname, 'TXT');
  const options = new URLSearchParams(txt.join('').replace(/^|$/g, '').replace(/\s*/g, ''));
  for (const [key, value] of parsed.searchParams) options.set(key, value);
  options.set('tls', 'true');
  const credentials = parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@` : '';
  return `mongodb://${credentials}${hosts.join(',')}${parsed.pathname}?${options}`;
}
async function connectAtlas(uri: string) {
  const options = { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 5000, maxPoolSize: 5 };
  try { return await mongoose.connect(uri, options); }
  catch (error) {
    if (!/querySrv|EBADRESP|ENOTFOUND|EAI_AGAIN/.test(error instanceof Error ? error.message : String(error))) throw error;
    await mongoose.disconnect();
    return mongoose.connect(await directAtlasUri(uri), options);
  }
}
export async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.startsWith('mongodb+srv://')) throw new ClaimsError('Configure server-only MONGODB_URI with an Atlas connection URI.', 503, 'DATABASE_NOT_CONFIGURED');
  state.tabayyunMongo ??= connectAtlas(uri).catch(() => { state.tabayyunMongo = undefined; throw new ClaimsError('Evidence storage is unavailable.', 503, 'DATABASE_UNAVAILABLE'); });
  return state.tabayyunMongo;
}
const required = { type: String, required: true };
const resourceSchema = new Schema({ id: required, provider: { ...required, enum: ['quran-foundation', 'sunnah', 'ummah', 'shamela', 'turath', 'openiti', 'parse'] }, providerId: required, type: { ...required, enum: ['arabic', 'translation', 'tafsir', 'word-by-word', 'mutashabihat', 'hadith', 'book'] }, title: required, language: required, url: required, author: String, translator: String, editor: String, edition: required, approval: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, sourceReviewStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'out-of-scope'] }, usagePermissionStatus: { type: String, enum: ['not-reviewed', 'permitted', 'noncommercial-only', 'restricted', 'unclear'] }, technicalStatus: { type: String, enum: ['not-ingested', 'preview-ready', 'retrieval-ready', 'disabled'] }, reviewer: String, reviewedAt: Date, reviewNotes: String }, { timestamps: true });
resourceSchema.index({ id: 1 }, { unique: true }); resourceSchema.index({ provider: 1, providerId: 1, language: 1, edition: 1 }, { unique: true }); resourceSchema.index({ approval: 1, provider: 1 });
const submissionSchema = new Schema({ owner: required, materialId: required, revision: Number, inputType: String, submittedText: String, extractedText: String, uploadReference: String, status: String }, { timestamps: true });
submissionSchema.index({ owner: 1, materialId: 1, revision: 1 }, { unique: true });
const claimSchema = new Schema({ owner: required, claimId: required, revision: Number, submissionId: required, claim: Schema.Types.Mixed, parsedReference: Schema.Types.Mixed }, { timestamps: true });
claimSchema.index({ owner: 1, claimId: 1, revision: 1 }, { unique: true }); claimSchema.index({ submissionId: 1 });
const evidenceSchema = new Schema({ id: required, resourceId: required, contentHash: required, language: required, edition: required, translationIdentity: String, locator: required, provider: required, originalText: required, normalizedText: required, sourceUrl: required, sourceTitle: String, author: String, context: String, grades: [{ authority: String, grade: String }], limitations: [String], retrievedAt: Date });
evidenceSchema.index({ id: 1 }, { unique: true }); evidenceSchema.index({ resourceId: 1, edition: 1, language: 1, translationIdentity: 1, locator: 1, contentHash: 1 }, { unique: true });
evidenceSchema.add({ structuredLocator: Schema.Types.Mixed });
const retrievalSchema = new Schema({ owner: required, claimId: required, claimRevision: Number, run: Schema.Types.Mixed }, { timestamps: true }); retrievalSchema.index({ owner: 1, claimId: 1, claimRevision: 1, createdAt: -1 });
const findingSchema = new Schema({ owner: required, claimId: required, evidenceIds: [String], outcome: String, explanation: String, limitations: [String], analyzedAt: Date, model: String, promptVersion: String, analysis: Schema.Types.Mixed }); findingSchema.index({ owner: 1, claimId: 1, analyzedAt: -1 });
const attemptSchema = new Schema({ owner: required, claimId: required, provider: required, lookupType: String, reference: String, durationMs: Number, attempts: Number, outcome: { type: String, enum: ['success', 'no_match', 'unavailable', 'error', 'unsupported', 'not_configured'] } }, { timestamps: true }); attemptSchema.index({ owner: 1, claimId: 1, createdAt: -1 });
function model(name: string, schema: Schema) { return mongoose.models[name] || mongoose.model(name, schema, name); }
// Only transient quota counters expire; research records are untouched.
const quotaSchema = new Schema({ _id: String, count: { type: Number, required: true }, expiresAt: { type: Date, required: true } });
quotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Resources = model('resources', resourceSchema), Submissions = model('submissions', submissionSchema), Claims = model('claims', claimSchema), EvidenceRecords = model('evidence', evidenceSchema), Findings = model('findings', findingSchema), Attempts = model('retrievalAttempts', attemptSchema), Retrievals = model('retrievals', retrievalSchema), Quotas = model('requestQuotas', quotaSchema);

const sourceBookSchema = new Schema({
  id: required, provider: { ...required, enum: ['openiti'] }, providerId: required,
  title: required, author: required, language: required, edition: required,
  release: required, commit: required, sourceUrl: required, metadataUrl: required,
  license: required, licenseUrl: required, attribution: required,
  originalPath: required, originalHeader: required,
  approval: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  sourceReviewStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'out-of-scope'], default: 'pending' },
  usagePermissionStatus: { type: String, enum: ['not-reviewed', 'permitted', 'noncommercial-only', 'restricted', 'unclear'], default: 'not-reviewed' },
  technicalStatus: { type: String, enum: ['not-ingested', 'preview-ready', 'retrieval-ready', 'disabled'], default: 'not-ingested' },
}, { timestamps: true });
sourceBookSchema.index({ id: 1 }, { unique: true });
sourceBookSchema.index({ provider: 1, providerId: 1, release: 1 }, { unique: true });
const sourcePassageSchema = new Schema({
  id: required, bookId: required, sequence: { type: Number, required: true },
  locator: required, pageMarker: required, originalText: required, normalizedText: required,
});
sourcePassageSchema.index({ id: 1 }, { unique: true });
sourcePassageSchema.index({ bookId: 1, sequence: 1 }, { unique: true });
sourcePassageSchema.index({ bookId: 1, normalizedText: 'text' });
export const SourceBooks = model('sourceBooks', sourceBookSchema);
export const SourcePassages = model('sourcePassages', sourcePassageSchema);
