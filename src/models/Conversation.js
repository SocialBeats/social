import mongoose, { Schema } from 'mongoose';

export const validateTwoDistinctParticipants = (participants) =>
  Array.isArray(participants) &&
  participants.length === 2 &&
  participants[0].toString() !== participants[1].toString();

const LastMessageSchema = new Schema(
  {
    text: { type: String, required: true },
    timestamp: { type: Date, required: true },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { _id: false } // asegura que Mongoose no cree un _id para el sub-documento,
);

const ConversationSchema = new Schema(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      required: true,
      validate: {
        validator: validateTwoDistinctParticipants,
        message: 'Debe haber exactamente dos participantes distintos.',
      },
    },

    conversationKey: {
      type: String,
      required: true,
      unique: true,
    },

    lastMessage: {
      type: LastMessageSchema,
      required: true,
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: () => ({}),
    },

    isDeletedBy: {
      type: Map,
      of: Boolean,
      default: () => ({}),
    },
  },
  {
    // Mongoose se encarga de crear y actualizar 'createdAt' y 'updatedAt' (el campo de ordenación)
    timestamps: true,
  }
);

ConversationSchema.index({ participants: 1, updatedAt: -1 });

ConversationSchema.pre('validate', function (next) {
  if (Array.isArray(this.participants) && this.participants.length >= 2) {
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
    this.conversationKey = `${this.participants[0]}-${this.participants[1]}`;
  }
  next();
});

export default mongoose.model('Conversation', ConversationSchema);
