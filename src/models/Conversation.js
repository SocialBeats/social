import mongoose, { Schema } from 'mongoose';

const validateTwoDistinctParticipants = (participants) =>
  participants.length === 2 &&
  participants[0].toString() !== participants[1].toString();

const LastMessageSchema = new Schema(
  {
    text: { type: String, required: true },
    timestamp: { type: Date, required: true },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false } // asegura que Mongoose no cree un _id para el sub-documento,
);

const ConversationSchema = new Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: [
          validateTwoDistinctParticipants,
          'Debe haber exactamente dos participantes distintos.',
        ],
      },
    ],

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
      default: {},
    },

    isDeletedBy: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  {
    // Mongoose se encarga de crear y actualizar 'createdAt' y 'updatedAt' (el campo de ordenación)
    timestamps: true,
  }
);

ConversationSchema.index({ participants: 1, updatedAt: -1 });

ConversationSchema.pre('save', function (next) {
  // Ordenar los participantes por su ID para evitar duplicados por orden
  this.participants.sort();

  this.conversationKey = `${this.participants[0]}-${this.participants[1]}`;
  next();
});

export default mongoose.model('Conversation', ConversationSchema);
