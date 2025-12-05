import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

MessageSchema.path('text').validate(function (value) {
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
}, 'El mensaje no puede estar vacío.');

export default mongoose.model('Message', MessageSchema);
