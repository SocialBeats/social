import logger from '../../logger.js'; // Logger para manejar errores
import messageService from '../services/messageService.js'; // Servicio de mensajes

const baseAPIURL = '/api/v1';

export default function messageRoutes(app) {
  /**
   * @swagger
   * /api/v1/messages/{recipientId}:
   *   post:
   *     tags:
   *       - Messages
   *     summary: Send a message
   *     description: Sends a message from the authenticated user to the specified recipient.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: recipientId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the recipient user.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - body
   *             properties:
   *               body:
   *                 type: string
   *                 description: Content of the message.
   *                 example: "Hey, let's collaborate on this track!"
   *     responses:
   *       201:
   *         description: Message successfully sent.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 conversationId:
   *                   type: string
   *                 senderId:
   *                   type: string
   *                 recipientId:
   *                   type: string
   *                 body:
   *                   type: string
   *                 createdAt:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: Unauthorized. Token missing or invalid.
   *       403:
   *         description: Users are not friends.
   *       500:
   *         description: Internal server error.
   */
  app.post(`${baseAPIURL}/messages/:recipientId`, async (req, res) => {
    try {
      const senderId = req.user.id; // Usando el ID del usuario autenticado
      const { recipientId } = req.params;
      const { body } = req.body;

      // Enviar el mensaje utilizando el servicio de mensajes
      const message = await messageService.sendMessage({
        senderId,
        recipientId,
        body,
      });

      return res.status(201).send({
        id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        body: message.body,
        createdAt: message.createdAt,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).send({ message: err.message });
      }
      logger.error(`Internal server error while sending message: ${err}`);
      return res.status(500).send({
        message: 'Internal server error while sending message',
      });
    }
  });

  /**
   * @swagger
   * /api/v1/conversations/{conversationId}/messages:
   *   get:
   *     tags:
   *       - Messages
   *     summary: List all messages in a conversation
   *     description: Retrieves all messages in a specific conversation.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: conversationId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the conversation.
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination.
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 20
   *         description: Number of messages per page.
   *     responses:
   *       200:
   *         description: List of messages in the conversation.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       senderId:
   *                         type: string
   *                       recipientId:
   *                         type: string
   *                       body:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                 page:
   *                   type: integer
   *                 limit:
   *                   type: integer
   *                 total:
   *                   type: integer
   *       401:
   *         description: Unauthorized. Token missing or invalid.
   *       404:
   *         description: Conversation not found.
   *       500:
   *         description: Internal server error.
   */
  app.get(
    `${baseAPIURL}/conversations/:conversationId/messages`,
    async (req, res) => {
      try {
        const userId = req.user.id; // Usando el ID del usuario autenticado
        const { conversationId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const result = await messageService.getConversationMessages({
          conversationId,
          page,
          limit,
        });

        return res.status(200).send(result);
      } catch (err) {
        if (err.status) {
          return res.status(err.status).send({ message: err.message });
        }
        logger.error(`Internal server error while retrieving messages: ${err}`);
        return res.status(500).send({
          message: 'Internal server error while retrieving messages',
        });
      }
    }
  );
}
