import mongoose from 'mongoose';

const { Schema } = mongoose;

const feedSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    beatId: { type: Schema.Types.ObjectId, required: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

feedSchema.index({ userId: 1, beatId: 1 }, { unique: true });

feedSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Feed', feedSchema);
