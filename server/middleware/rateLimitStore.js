import mongoose from "mongoose";

// Rate limit counters kept in MongoDB, so every serverless instance sees the
// same count. Documents expire on their own once the window has passed.
const hitSchema = new mongoose.Schema({
  _id: String,
  hits: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
});
hitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitHit = mongoose.models.RateLimitHit || mongoose.model("RateLimitHit", hitSchema);

export class MongoStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    const doc = await RateLimitHit.findById(this.key(key)).lean();
    return doc && doc.resetAt > new Date() ? { totalHits: doc.hits, resetTime: doc.resetAt } : undefined;
  }

  async increment(key) {
    const now = new Date();
    const id = this.key(key);
    // Start a new window when the old one has run out, otherwise count on
    const fresh = await RateLimitHit.findOneAndUpdate(
      { _id: id, resetAt: { $lte: now } },
      { $set: { hits: 1, resetAt: new Date(now.getTime() + this.windowMs) } },
      { new: true },
    ).lean();
    if (fresh) return { totalHits: fresh.hits, resetTime: fresh.resetAt };

    try {
      const doc = await RateLimitHit.findOneAndUpdate(
        { _id: id },
        { $inc: { hits: 1 }, $setOnInsert: { resetAt: new Date(now.getTime() + this.windowMs) } },
        { new: true, upsert: true },
      ).lean();
      return { totalHits: doc.hits, resetTime: doc.resetAt };
    } catch (error) {
      // Two first hits at once: one insert wins, so count again
      if (error.code === 11000) return this.increment(key);
      throw error;
    }
  }

  async decrement(key) {
    await RateLimitHit.updateOne({ _id: this.key(key) }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await RateLimitHit.deleteOne({ _id: this.key(key) });
  }
}
