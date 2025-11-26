import mongoose from 'mongoose';
import { Message, Conversation } from '../models/models.js';
// Asegúrate de tener la validación de amistad
//import { ensureUsersAreFriends } from './friendshipService.js';

class MessageService {
  // Crear un mensaje
  async sendMessage({ senderId, recipientId, body }) {
    try {
      // Validar que los usuarios sean amigos
      // await ensureUsersAreFriends(senderId, recipientId);

      // Obtener o crear la conversación
      const conversation = await Conversation.findOne({
        participantIds: { $all: [senderId, recipientId] },
      });

      if (!conversation) {
        const newConversation = new Conversation({
          participantIds: [senderId, recipientId],
        });
        await newConversation.save();
      }

      const message = new Message({
        conversationId: conversation._id,
        senderId,
        recipientId,
        body,
      });

      await message.validate();
      await message.save();

      // Actualizar la conversación con el último mensaje
      conversation.lastMessageAt = message.createdAt;
      conversation.lastMessageText = body;
      await conversation.save();

      return message;
    } catch (err) {
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
          .map((e) => e.message)
          .join(', ');
        const status = 422;
        throw { status, message };
      }

      if (err.status) {
        throw err;
      }

      throw err;
    }
  }

  // Obtener todos los mensajes de una conversación
  async getConversationMessages({ conversationId, page = 1, limit = 20 }) {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        const status = 404;
        const message = 'Conversation not found';
        throw { status, message };
      }

      page = Number(page);
      limit = Number(limit);

      if (!Number.isInteger(page) || page < 1) page = 1;
      if (!Number.isInteger(limit) || limit < 1) limit = 20;
      if (limit > 100) limit = 100; // Limitar máximo

      const skip = (page - 1) * limit;

      const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 }) // Ordenar por fecha de creación (descenente)
        .skip(skip)
        .limit(limit);

      const total = await Message.countDocuments({ conversationId });

      const maxPage = Math.max(1, Math.ceil(total / limit));

      if (page > maxPage) page = maxPage;

      return {
        data: messages,
        page,
        limit,
        total,
      };
    } catch (err) {
      if (err.status) {
        throw err;
      }

      throw err;
    }
  }
}

export default new MessageService();
