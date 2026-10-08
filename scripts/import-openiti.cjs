/* eslint-disable @typescript-eslint/no-require-imports -- Controlled import of one pinned OpenITI release file. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
if (fs.existsSync('.env.local')) process.loadEnvFile?.('.env.local');
const VERSION = '0987ZaynDinMalibari.FathMucin.JK000228-ara1';
const RELEASE = 'v2025.1.9';
const COMMIT = 'cfc4157a3cf2054c0888f133970a4eaa3e22e58c';
const sourcePath = path.join('data', 'openiti', VERSION);
const sourceUrl = `https://github.com/OpenITI/RELEASE/blob/${COMMIT}/data/0987ZaynDinMalibari/0987ZaynDinMalibari.FathMucin/${VERSION}`;
const metadataUrl = `https://github.com/OpenITI/RELEASE/blob/${COMMIT}/metadata/OpenITI_metadata_2025-1-9.tsv#L9916`;
const fold = value => value.normalize('NFC').replace(/[\u064b-\u065f\u0670\u0640]/gu, '').replace(/[إأآٱ]/gu, 'ا').replace(/ى/gu, 'ي').replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي').replace(/\s+/gu, ' ').trim();
function parse(text) {
  const end = text.indexOf('#META#Header#End#');
  if (end < 0) throw new Error('OpenITI metadata terminator missing');
  const originalHeader = text.slice(0, end + '#META#Header#End#'.length);
  const body = text.slice(end + '#META#Header#End#'.length);
  const markers = [...body.matchAll(/PageV(\d{2})P(\d{3})/g)];
  if (!markers.length) throw new Error('No OpenITI page markers found');
  return { originalHeader, passages: markers.map((match, sequence) => {
    const start = sequence === 0 ? 0 : match.index;
    const next = markers[sequence + 1];
    const originalText = body.slice(start, next?.index ?? body.length).trim();
    const pageMarker = match[0];
    return { id: `${VERSION}:${pageMarker}`, bookId: `openiti:${VERSION}`, sequence, locator: `vol. ${Number(match[1])}, p. ${Number(match[2])}`, pageMarker, originalText, normalizedText: fold(originalText) };
  }) };
}
async function main() {
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) throw new Error('Atlas MONGODB_URI required');
  const original = fs.readFileSync(sourcePath, 'utf8');
  const { originalHeader, passages } = parse(original);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 8000 });
  const books = mongoose.connection.collection('sourceBooks'), pages = mongoose.connection.collection('sourcePassages'), resources = mongoose.connection.collection('resources');
  const book = { id: `openiti:${VERSION}`, provider: 'openiti', providerId: VERSION, title: 'فتح المعين بشرح قرة العين', author: 'زين الدين بن عبد العزيز المليباري', language: 'ar', edition: 'بيروت: دار الفكر (year not supplied in OpenITI metadata)', release: RELEASE, commit: COMMIT, sourceUrl, metadataUrl, license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', attribution: `OpenITI ${RELEASE}, ${VERSION}; source library identifier JK000228.`, originalPath: sourcePath.replaceAll('\\', '/'), originalHeader, approval: 'pending', contentHash: crypto.createHash('sha256').update(original).digest('hex'), updatedAt: new Date() };
  await books.createIndex({ id: 1 }, { unique: true }); await pages.createIndex({ id: 1 }, { unique: true }); await pages.createIndex({ bookId: 1, sequence: 1 }, { unique: true });
  await books.updateOne({ id: book.id }, { $set: book, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  await pages.deleteMany({ bookId: book.id }); if (passages.length) await pages.insertMany(passages);
  await resources.updateOne({ id: book.id }, { $set: { id: book.id, provider: 'openiti', providerId: VERSION, type: 'book', title: book.title, language: 'ar', url: sourceUrl, author: book.author, edition: book.edition, approval: 'pending', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  console.log(JSON.stringify({ imported: book.id, passages: passages.length, approval: 'pending', release: RELEASE, commit: COMMIT, hash: book.contentHash }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => mongoose.disconnect());