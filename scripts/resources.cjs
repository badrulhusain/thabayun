/* eslint-disable @typescript-eslint/no-require-imports -- Controlled offline resource review CLI. */
// No public resource approval route. Import only deliberately prepared records; pending is not approval.
const fs = require('node:fs');
const mongoose = require('mongoose');
const { connectAtlas } = require('./atlas-connection.cjs');
if (fs.existsSync('.env.local')) process.loadEnvFile?.('.env.local');
async function main() {
  const filename = process.argv[2]; if (!filename) throw new Error('Usage: node scripts/resources.cjs <reviewed-resources.json>');
  const resources = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!Array.isArray(resources) || resources.length > 100) throw new Error('Expected at most 100 resource records');
  for (const r of resources) {
    for (const key of ['id', 'providerId', 'title', 'language', 'edition', 'url']) if (typeof r[key] !== 'string' || !r[key].trim() || r[key].length > 2000) throw new Error(`Invalid ${key}`);
    if (!['quran-foundation', 'sunnah', 'ummah', 'shamela', 'turath', 'openiti', 'parse'].includes(r.provider) || !['arabic', 'translation', 'tafsir', 'word-by-word', 'mutashabihat', 'hadith', 'book'].includes(r.type) || !['pending', 'approved', 'rejected'].includes(r.approval)) throw new Error('Invalid resource enum');
    if (r.sourceReviewStatus !== undefined && !['pending', 'approved', 'rejected', 'out-of-scope'].includes(r.sourceReviewStatus)) throw new Error('Invalid sourceReviewStatus');
    if (r.usagePermissionStatus !== undefined && !['not-reviewed', 'permitted', 'noncommercial-only', 'restricted', 'unclear'].includes(r.usagePermissionStatus)) throw new Error('Invalid usagePermissionStatus');
    if (r.technicalStatus !== undefined && !['not-ingested', 'preview-ready', 'retrieval-ready', 'disabled'].includes(r.technicalStatus)) throw new Error('Invalid technicalStatus');
    if (r.type === 'book' && (!r.sourceReviewStatus || !r.usagePermissionStatus || !r.technicalStatus)) throw new Error('Book resources require separate source-review, usage-permission, and technical statuses');
    if (new URL(r.url).protocol !== 'https:') throw new Error('HTTPS source URL required');
    if (r.approval === 'approved' && (!r.reviewer || !r.reviewNotes || !Number.isFinite(Date.parse(r.reviewedAt)))) throw new Error('Approval requires actual reviewer, timestamp and notes');
    if (r.type === 'book' && r.approval === 'approved' && (r.sourceReviewStatus !== 'approved' || r.usagePermissionStatus !== 'permitted' || r.technicalStatus !== 'retrieval-ready')) throw new Error('Approved book evidence requires approved source review, permitted usage, and retrieval-ready technical status');
  }
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) throw new Error('Atlas MONGODB_URI required');
  await connectAtlas(mongoose, process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 12000 });
  const collection = mongoose.connection.collection('resources');
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ provider: 1, providerId: 1, language: 1, edition: 1 }, { unique: true });
  for (const r of resources) { const fields = Object.fromEntries(['id','provider','providerId','type','title','language','edition','url','author','translator','editor','approval','sourceReviewStatus','usagePermissionStatus','technicalStatus','reviewer','reviewNotes','reviewedAt'].filter(k => r[k] !== undefined).map(k => [k, k === 'reviewedAt' ? new Date(r[k]) : r[k]])); await collection.updateOne({ id: r.id }, { $set: { ...fields, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true }); }
  console.log(`Saved ${resources.length} resource records with their supplied review status.`);
}
main().catch(() => { console.error('Resource import failed. Check configuration and prepared input; credentials are never printed.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
