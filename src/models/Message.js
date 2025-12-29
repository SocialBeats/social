import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, required: true, maxlength: 1000, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// Para paginación eficiente: (conversationId, createdAt)
messageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
