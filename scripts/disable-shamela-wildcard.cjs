/* eslint-disable @typescript-eslint/no-require-imports -- Narrow resource-governance maintenance command. */
const fs = require('node:fs');
const mongoose = require('mongoose');
const { connectAtlas } = require('./atlas-connection.cjs');

if (fs.existsSync('.env.local')) process.loadEnvFile?.('.env.local');

async function main() {
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) throw new Error('Atlas MONGODB_URI required');
  await connectAtlas(mongoose, process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'tabayyun', serverSelectionTimeoutMS: 12000 });
  const resources = mongoose.connection.collection('resources');
  const filter = { id: 'shamela-parse-all-ar', provider: 'shamela', providerId: 'all' };
  const result = await resources.updateOne(filter, { $set: {
    approval: 'pending',
    sourceReviewStatus: 'out-of-scope',
    usagePermissionStatus: 'not-reviewed',
    technicalStatus: 'disabled',
    updatedAt: new Date(),
  } }, { upsert: false });
  const record = await resources.findOne(filter, { projection: { _id: 0, id: 1, provider: 1, providerId: 1, approval: 1, sourceReviewStatus: 1, usagePermissionStatus: 1, technicalStatus: 1 } });
  console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount, record }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
