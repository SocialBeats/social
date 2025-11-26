import mongoose from 'mongoose';
import Conversation from './Conversation.js'; // Referencia al modelo de Conversation

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Referencia al modelo de User
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['sent', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

// Validación antes de guardar el mensaje
messageSchema.pre('validate', async function (next) {
  try {
    const conversation = await Conversation.findById(this.conversationId);
    if (!conversation) {
      return next(new Error('The conversation does not exist.'));
    }

    if (
      ![
        conversation.participantIds[0],
        conversation.participantIds[1],
      ].includes(this.senderId)
    ) {
      return next(new Error('The sender must be part of the conversation.'));
    }

    if (
      ![
        conversation.participantIds[0],
        conversation.participantIds[1],
      ].includes(this.recipientId)
    ) {
      return next(new Error('The recipient is not part of this conversation.'));
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
