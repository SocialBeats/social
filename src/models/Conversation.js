import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct'], default: 'direct', index: true },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    membersKey: { type: String, required: true, unique: true, index: true },

    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageText: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('Conversation', conversationSchema);
