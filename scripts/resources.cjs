/* eslint-disable @typescript-eslint/no-require-imports -- Controlled offline resource review CLI. */
// No public resource approval route. Never run with unreviewed input.
const fs = require('node:fs');
const mongoose = require('mongoose');
if (fs.existsSync('.env.local')) process.loadEnvFile?.('.env.local');
async function main() {
  const filename = process.argv[2]; if (!filename) throw new Error('Usage: node scripts/resources.cjs <reviewed-resources.json>');
  const resources = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!Array.isArray(resources) || resources.length > 100) throw new Error('Expected at most 100 resource records');
  for (const r of resources) {
    for (const key of ['id', 'providerId', 'title', 'language', 'edition', 'url']) if (typeof r[key] !== 'string' || !r[key].trim() || r[key].length > 2000) throw new Error(`Invalid ${key}`);
    if (!['quran-foundation', 'sunnah', 'ummah', 'turath', 'openiti', 'parse'].includes(r.provider) || !['arabic', 'translation', 'tafsir', 'word-by-word', 'mutashabihat', 'hadith', 'book'].includes(r.type) || !['pending', 'approved', 'rejected'].includes(r.approval)) throw new Error('Invalid resource enum');
    if (new URL(r.url).protocol !== 'https:') throw new Error('HTTPS source URL required');
    if (r.approval === 'approved' && (!r.reviewer || !r.reviewNotes || !Number.isFinite(Date.parse(r.reviewedAt)))) throw new Error('Approval requires actual reviewer, timestamp and notes');
  }
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) throw new Error('Atlas MONGODB_URI required');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 5000 });
  const collection = mongoose.connection.collection('resources');
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ provider: 1, providerId: 1, language: 1, edition: 1 }, { unique: true });
  for (const r of resources) { const fields = Object.fromEntries(['id','provider','providerId','type','title','language','edition','url','author','translator','editor','approval','reviewer','reviewNotes','reviewedAt'].filter(k => r[k] !== undefined).map(k => [k, k === 'reviewedAt' ? new Date(r[k]) : r[k]])); await collection.updateOne({ id: r.id }, { $set: { ...fields, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true }); }
  console.log(`Saved ${resources.length} reviewed resource records.`);
}
main().catch(() => { console.error('Resource import failed. Check configuration and reviewed input; credentials are never printed.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
