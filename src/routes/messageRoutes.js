import express from 'express';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

// Middleware de Bypass (igual que en Conversation.routes)
const fakeAuthBypass = (req, res, next) => {
  req.user = { id: '8ff62d2542f763ee4f236eef' };
  next();
};

/**
 * @swagger
 * tags:
 *   - name: Messages
 *     description: Gestión de mensajes dentro de una conversación
 *
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 675ff2a3e4a1c3f4d1234567
 *         conversationId:
 *           type: string
 *           description: ID de la conversación a la que pertenece el mensaje
 *         senderId:
 *           type: string
 *           description: ID del usuario que envía el mensaje
 *         text:
 *           type: string
 *           description: Contenido del mensaje
 *           example: "Hola, ¿qué tal?"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Enviar un nuevo mensaje (crea la conversación si no existe)
 *     description: >
 *       Envía un mensaje de un usuario autenticado a un destinatario.
 *       Si todavía no existe conversación entre esos dos usuarios, la crea con este mensaje como primero.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - text
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: ID del usuario receptor.
 *                 example: "740036510eef829707d4f080"
 *               text:
 *                 type: string
 *                 example: "Hola, ¿qué tal?"
 *     responses:
 *       '201':
 *         description: Mensaje creado correctamente (y conversación creada o reutilizada).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *                 conversation:
 *                   $ref: '#/components/schemas/ConversationResponse'
 *       '400':
 *         description: Petición inválida (faltan campos o texto vacío)
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Prohibido (el usuario no puede hablar con ese destinatario)
 */
router.post('/messages', fakeAuthBypass, messageController.sendMessage);

/**
 * @swagger
 * /api/v1/conversations/{convId}/messages:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Listar mensajes de una conversación
 *     description: Devuelve los mensajes de una conversación, ordenados cronológicamente (del más antiguo al más nuevo).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversación.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Número máximo de mensajes a devolver (para paginación).
 *     responses:
 *       '200':
 *         description: Lista de mensajes de la conversación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Prohibido (el usuario no es participante de la conversación)
 *       '404':
 *         description: Conversación no encontrada
 */
router.get(
  '/conversations/:convId/messages',
  fakeAuthBypass,
  messageController.listMessagesForConversation
);

/**
 * @swagger
 * /api/v1/conversations/{convId}/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Enviar un nuevo mensaje en una conversación existente
 *     description: >
 *       Crea un mensaje dentro de una conversación existente. No crea la conversación;
 *       solo la actualiza con el nuevo lastMessage y unreadCount.
 *       Úsalo cuando el cliente ya conoce el ID de la conversación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Hola, ¿qué tal?"
 *     responses:
 *       '201':
 *         description: Mensaje creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *                 updatedConversation:
 *                   $ref: '#/components/schemas/ConversationResponse'
 *       '400':
 *         description: Petición inválida (por ejemplo, texto vacío)
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Prohibido (el usuario no es participante)
 *       '404':
 *         description: Conversación no encontrada
 */
router.post(
  '/conversations/:convId/messages',
  fakeAuthBypass,
  messageController.createMessageInConversation
);

/**
 * @swagger
 * /api/v1/messages/{messageId}:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Obtener un mensaje por su ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje.
 *     responses:
 *       '200':
 *         description: Mensaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Prohibido (el usuario no pertenece a la conversación)
 *       '404':
 *         description: Mensaje no encontrado
 */
router.get(
  '/messages/:messageId',
  fakeAuthBypass,
  messageController.getMessageById
);

export default router;
