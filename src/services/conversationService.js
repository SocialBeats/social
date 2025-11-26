import mongoose from 'mongoose';
import { Conversation } from '../models/models.js';

class ConversationService {
  // Listar todas las conversaciones de un usuario, ordenadas por el último mensaje recibido
  async listUserConversations({ userId, page = 1, limit = 20 }) {
    try {
      // Normalización de parámetros
      page = Number(page);
      limit = Number(limit);

      if (!Number.isInteger(page) || page < 1) page = 1;
      if (!Number.isInteger(limit) || limit < 1) limit = 20;
      if (limit > 100) limit = 100; // Limitar máximo

      const skip = (page - 1) * limit;

      // Filtramos por `participantIds` para obtener las conversaciones donde el usuario esté
      const filter = { participantIds: userId };

      // Contamos el total de conversaciones
      const total = await Conversation.countDocuments(filter);

      // Calculamos el número máximo de páginas
      const maxPage = Math.max(1, Math.ceil(total / limit));

      // Si la página solicitada es mayor que la última página, usamos la última página
      if (page > maxPage) page = maxPage;

      // Obtenemos las conversaciones ordenadas por la fecha del último mensaje
      const conversations = await Conversation.find(filter)
        .sort({ lastMessageAt: -1 }) // Ordenar por `lastMessageAt` de forma descendente (último mensaje primero)
        .skip(skip)
        .limit(limit);

      return {
        data: conversations,
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

export default new ConversationService();
