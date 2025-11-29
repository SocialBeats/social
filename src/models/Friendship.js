import mongoose from 'mongoose';

const { Schema } = mongoose;

const friendshipSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

friendshipSchema.index(
  { requester: 1, recipient: 1 },
  { unique: true, partialFilterExpression: { status: { $exists: true } } }
);

export default mongoose.model('Friendship', friendshipSchema);
