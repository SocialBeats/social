import mongoose from 'mongoose';
import { Conversation, Message } from '../models/models.js';

/**
 * POST /api/v1/messages
 * Envía un mensaje. Si no existe conversación entre sender y recipient, la crea.
 */
const sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { recipientId, text } = req.body;

  if (!recipientId || !text) {
    return res.status(400).json({
      message: 'recipientId y text son obligatorios.',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    return res.status(400).json({
      message: 'ID de destinatario no válido.',
    });
  }

  if (senderId.toString() === recipientId.toString()) {
    return res.status(400).json({
      message: 'No puedes enviarte mensajes a ti mismo.',
    });
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return res.status(400).json({
      message: 'El mensaje no puede estar vacío.',
    });
  }

  try {
    // 1. Normalizar participantes (orden lexicográfico por string)
    const participants = [senderId, recipientId].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );

    const conversationKey = `${participants[0]}-${participants[1]}`;

    // 2. Buscar conversación existente entre esos 2 usuarios
    let conversation = await Conversation.findOne({ conversationKey });

    const now = new Date();

    // 3. Si no existe, crear conversación nueva con este como primer mensaje
    if (!conversation) {
      conversation = new Conversation({
        participants,
        conversationKey,
        lastMessage: {
          text: trimmedText,
          timestamp: now,
          senderId,
        },
        // Ambos empiezan en 0; más abajo el código genérico sumará 1 al receptor
        unreadCount: {
          [senderId]: 0,
          [recipientId]: 0,
        },
        isDeletedBy: {}, // nadie la ha borrado aún
      });

      await conversation.save();
    }

    // 4. Crear el mensaje ligado a esa conversación
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      text: trimmedText,
    });

    // 5. Actualizar lastMessage y unreadCount
    const receiverId =
      conversation.participants.find(
        (p) => p.toString() !== senderId.toString()
      ) || recipientId;

    const receiverKey = receiverId.toString();

    // unreadCount es un Map (por schema), pero por si acaso…
    if (!conversation.unreadCount) {
      conversation.unreadCount = new Map();
    }

    const currentUnread = conversation.unreadCount.get(receiverKey) || 0;

    conversation.lastMessage = {
      text: trimmedText,
      timestamp: message.createdAt,
      senderId,
    };
    conversation.unreadCount.set(receiverKey, currentUnread + 1);

    // 6. Si la conversación estaba marcada como borrada para alguno, la "revivimos"
    if (conversation.isDeletedBy) {
      conversation.isDeletedBy.set(senderId.toString(), false);
      conversation.isDeletedBy.set(receiverKey, false);
    }

    await conversation.save();

    return res.status(201).json({
      message,
      conversation,
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al enviar el mensaje.',
    });
  }
};

/**
 * POST /api/v1/conversations/:convId/messages
 * Crea un mensaje en una conversación YA EXISTENTE.
 */
const createMessageInConversation = async (req, res) => {
  const senderId = req.user.id;
  const { convId } = req.params;
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(convId)) {
    return res.status(400).json({ message: 'ID de conversación no válido.' });
  }

  const trimmedText = (text || '').trim();
  if (!trimmedText) {
    return res.status(400).json({
      message: 'El mensaje no puede estar vacío.',
    });
  }

  try {
    // 1. Buscar conversación y comprobar participación
    const conversation = await Conversation.findById(convId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        message:
          'Acceso denegado. No eres un participante de esta conversación.',
      });
    }

    // 2. Crear mensaje
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      text: trimmedText,
    });

    // 3. Calcular receptor
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== senderId.toString()
    );
    const receiverKey = receiverId.toString();

    const currentUnread = conversation.unreadCount.get(receiverKey) || 0;

    // 4. Actualizar lastMessage y unreadCount
    conversation.lastMessage = {
      text: trimmedText,
      timestamp: message.createdAt,
      senderId,
    };
    conversation.unreadCount.set(receiverKey, currentUnread + 1);

    // Revivir conversación para el remitente si estaba borrada
    if (conversation.isDeletedBy) {
      conversation.isDeletedBy.set(senderId.toString(), false);
    }

    await conversation.save();

    return res.status(201).json({
      message,
      updatedConversation: conversation,
    });
  } catch (error) {
    console.error('Error al crear mensaje en conversación:', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al crear el mensaje.' });
  }
};

/**
 * GET /api/v1/conversations/:convId/messages
 * Lista mensajes de una conversación en orden cronológico (viejo -> nuevo).
 */
const listMessagesForConversation = async (req, res) => {
  const userId = req.user.id;
  const { convId } = req.params;
  const { limit } = req.query;

  if (!mongoose.Types.ObjectId.isValid(convId)) {
    return res.status(400).json({ message: 'ID de conversación no válido.' });
  }

  const parsedLimit = limit ? parseInt(limit, 10) : null;
  const finalLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

  try {
    // 1. Comprobar que la conversación existe y que el usuario participa
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

    // 2. Buscar mensajes, ordenados de más viejo a más nuevo
    const query = Message.find({ conversationId: convId }).sort({
      createdAt: 1,
    });

    if (finalLimit) {
      query.limit(finalLimit);
    }

    const messages = await query.lean();

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error al listar mensajes de conversación:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al listar los mensajes.',
    });
  }
};

/**
 * GET /api/v1/messages/:messageId
 * Obtiene un mensaje por su ID, validando que el usuario pertenece a la conversación.
 */
const getMessageById = async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({ message: 'ID de mensaje no válido.' });
  }

  try {
    const message = await Message.findById(messageId).lean();

    if (!message) {
      return res.status(404).json({ message: 'Mensaje no encontrado.' });
    }

    // Verificar que el usuario es participante de la conversación de ese mensaje
    const conversation = await Conversation.findById(
      message.conversationId
    ).lean();

    if (!conversation) {
      return res
        .status(404)
        .json({ message: 'Conversación asociada no encontrada.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        message:
          'Acceso denegado. No eres un participante de la conversación de este mensaje.',
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error('Error al obtener mensaje por ID:', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al obtener el mensaje.' });
  }
};

export {
  sendMessage,
  createMessageInConversation,
  listMessagesForConversation,
  getMessageById,
};
