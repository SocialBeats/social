import mongoose from 'mongoose';

const { Schema } = mongoose;

const feedSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['friendship', 'beat', 'comment', 'rating'],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Clave lógica del evento para idempotencia (p.ej. beatId, commentId, friendshipId)
    entityId: { type: String, required: true },

    // Campos específicos según tipo
    beatId: { type: Schema.Types.ObjectId, default: null },
    friendId: { type: Schema.Types.ObjectId, default: null },
    commentId: { type: Schema.Types.ObjectId, default: null },

    title: { type: String, trim: true },
    text: { type: String, trim: true },
    thumbnailUrl: { type: String, default: null, trim: true },
    score: { type: Number, default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

feedSchema.index({ userId: 1, createdAt: -1 });
feedSchema.index(
  { userId: 1, type: 1, entityId: 1 },
  { unique: true, name: 'feed_unique_per_user_entity' }
);

export default mongoose.model('Feed', feedSchema);
