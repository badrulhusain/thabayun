import 'server-only';
import mongoose, { Schema } from 'mongoose';

const accountSchema = new Schema({
  username: { type: String, required: true, unique: true },
  owner: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });
const sessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  owner: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Accounts = mongoose.models.accounts || mongoose.model('accounts', accountSchema);
export const Sessions = mongoose.models.accountSessions || mongoose.model('accountSessions', sessionSchema);
