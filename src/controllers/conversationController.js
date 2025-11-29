import mongoose from 'mongoose';
import { Conversation } from '../models/models.js';

const listConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    const conversations = await Conversation.find({
      participants: userId,
      [`isDeletedBy.${userId}`]: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error al listar conversaciones:', error);
    res.status(500).json({
      message: 'Error interno del servidor al listar conversaciones.',
    });
  }
};

const getConversationMetadata = async (req, res) => {
  const userId = req.user.id;
  const { convId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(convId)) {
    return res.status(400).json({ message: 'ID de conversación no válido.' });
  }

  try {
    const conversation = await Conversation.findById(convId).lean();

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        message:
          'Acceso denegado. No eres un participante de esta conversación.',
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Error al obtener metadatos de conversación:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const markConversationAsRead = async (req, res) => {
  const userId = req.user.id;
  const { convId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(convId)) {
    return res.status(400).json({ message: 'ID de conversación no válido.' });
  }

  try {
    const updatedConversation = await Conversation.findOneAndUpdate(
      {
        _id: convId,
        participants: userId,
      },
      {
        $set: { [`unreadCount.${userId}`]: 0 },
      },
      {
        new: true,
        timestamps: false,
      }
    ).lean();

    if (!updatedConversation) {
      return res
        .status(404)
        .json({ message: 'Conversación no encontrada o acceso denegado.' });
    }

    res.status(200).json({
      message: 'Conversación marcada como leída.',
      updatedConversation: updatedConversation,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const deleteConversationLogically = async (req, res) => {
  const userId = req.user.id;
  const { convId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(convId)) {
    return res.status(400).json({ message: 'ID de conversación no válido.' });
  }

  try {
    const updatedConversation = await Conversation.findOneAndUpdate(
      {
        _id: convId,
        participants: userId,
      },
      {
        $set: { [`isDeletedBy.${userId}`]: true },
      },
      {
        new: true,
        timestamps: false,
      }
    ).lean();

    if (!updatedConversation) {
      return res
        .status(404)
        .json({ message: 'Conversación no encontrada o acceso denegado.' });
    }

    res.status(200).json({
      message: 'Conversación eliminada lógicamente.',
      updatedConversation: updatedConversation,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export {
  listConversations,
  getConversationMetadata,
  markConversationAsRead,
  deleteConversationLogically,
};
