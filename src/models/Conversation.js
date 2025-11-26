import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participantIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User', // Referencia al modelo de User
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Validación para asegurarse de que haya solo dos participantes
conversationSchema.pre('validate', function (next) {
  if (this.participantIds.length !== 2) {
    return next(new Error('A conversation must have exactly 2 participants.'));
  }

  // Validación de que los participantes son diferentes
  if (String(this.participantIds[0]) === String(this.participantIds[1])) {
    return next(
      new Error(
        'A conversation cannot have the same user as both participants.'
      )
    );
  }

  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
