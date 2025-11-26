import logger from '../../logger.js'; // Logger para manejar errores
import conversationService from '../services/conversationService.js'; // Servicio de conversaciones

const baseAPIURL = '/api/v1';

export default function conversationRoutes(app) {
  /**
   * @swagger
   * /api/v1/conversations:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: List all conversations of a user
   *     description: Retrieves all conversations for the authenticated user, sorted by the last message.
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Number of conversations per page.
   *     responses:
   *       200:
   *         description: List of conversations for the user.
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
   *                       participantIds:
   *                         type: array
   *                         items:
   *                           type: string
   *                       lastMessageAt:
   *                         type: string
   *                         format: date-time
   *                       lastMessageText:
   *                         type: string
   *                 page:
   *                   type: integer
   *                 limit:
   *                   type: integer
   *                 total:
   *                   type: integer
   *       401:
   *         description: Unauthorized. Token missing or invalid.
   *       500:
   *         description: Internal server error.
   */
  app.get(`${baseAPIURL}/conversations`, async (req, res) => {
    try {
      const userId = req.user.id; // Usando el ID del usuario autenticado
      const { page = 1, limit = 20 } = req.query;

      const result = await conversationService.listUserConversations({
        userId,
        page,
        limit,
      });

      return res.status(200).send(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).send({ message: err.message });
      }
      logger.error(
        `Internal server error while retrieving conversations: ${err}`
      );
      return res.status(500).send({
        message: 'Internal server error while retrieving conversations',
      });
    }
  });

  /**
   * @swagger
   * /api/v1/conversations/{conversationId}:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: Get a specific conversation
   *     description: Retrieves the details of a specific conversation.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: conversationId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the conversation to retrieve.
   *     responses:
   *       200:
   *         description: Conversation details successfully retrieved.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 participantIds:
   *                   type: array
   *                   items:
   *                     type: string
   *                 lastMessageAt:
   *                   type: string
   *                   format: date-time
   *                 lastMessageText:
   *                   type: string
   *       401:
   *         description: Unauthorized. Token missing or invalid.
   *       404:
   *         description: Conversation not found.
   *       500:
   *         description: Internal server error.
   */
  app.get(`${baseAPIURL}/conversations/:conversationId`, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id; // Usando el ID del usuario autenticado

      const conversation = await conversationService.getConversationById({
        conversationId,
        userId,
      });

      return res.status(200).send(conversation);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).send({ message: err.message });
      }
      logger.error(
        `Internal server error while retrieving conversation: ${err}`
      );
      return res.status(500).send({
        message: 'Internal server error while retrieving conversation',
      });
    }
  });
}
