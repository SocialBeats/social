import express from 'express';
import * as conversationController from '../controllers/conversationController.js';
//import verifyToken from '../middlewares/authMiddlewares.js';

const router = express.Router();

// Middleware de Bypass
const fakeAuthBypass = (req, res, next) => {
  req.user = { id: '8ff62d2542f763ee4f236eef' };
  next();
};

/**
 * @swagger
 * tags:
 *   - name: Conversations
 *     description: Gestión de conversaciones (metadata, listado y estado de lectura)
 * components:
 *   schemas:
 *     ConversationResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único de la conversación.
 *           example: 6655c69992f44200159422a5
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Array de IDs de los 2 participantes.
 *         lastMessage:
 *           type: object
 *           description: Metadatos del último mensaje (texto, hora, remitente).
 *           properties:
 *             text:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 *             senderId:
 *               type: string
 *               description: ID del remitente.
 *         unreadCount:
 *           type: object
 *           description: Contador de mensajes no leídos por participante (clave=userId, valor=count).
 *           example: { "6655c69992f44200159422a5": 5, "otro_id": 0 }
 *         isDeletedBy:
 *           type: object
 *           description: Estado de eliminación lógica por participante (clave=userId, valor=boolean).
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de la última actividad (usado para ordenar).
 */

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Listar todas las conversaciones del usuario
 *     description: Obtiene la bandeja de entrada del usuario autenticado, ordenada por la actividad más reciente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de conversaciones del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConversationResponse'
 *       '401':
 *         description: No autorizado (Token JWT faltante o inválido)
 */
//router.get('/', verifyToken, conversationController.listConversations);
router.get('/', fakeAuthBypass, conversationController.listConversations);

router
  .route('/:convId')
  /**
   * @swagger
   * /api/v1/conversations/{convId}:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: Obtener metadatos de una conversación
   *     description: Obtiene la información de una conversación por su ID.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: convId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID de la conversación.
   *     responses:
   *       '200':
   *         description: Metadatos de la conversación.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ConversationResponse'
   *       '401':
   *         description: No autorizado
   *       '403':
   *         description: Prohibido (El usuario no es participante)
   *       '404':
   *         description: Conversación no encontrada
   */
  //.get(verifyToken, conversationController.getConversationMetadata)
  .get(fakeAuthBypass, conversationController.getConversationMetadata)
  /**
   * @swagger
   * /api/v1/conversations/{convId}:
   *   delete:
   *     tags:
   *       - Conversations
   *     summary: Eliminar lógicamente una conversación
   *     description: Marca la conversación como eliminada para el usuario solicitante (eliminación lógica).
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: convId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la conversación.
   *     responses:
   *       '200':
   *         description: Conversación marcada como eliminada exitosamente.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Conversación eliminada lógicamente."
   *       '401':
   *         description: No autorizado
   *       '403':
   *         description: Prohibido
   *       '404':
   *         description: Conversación no encontrada
   */
  //.delete(verifyToken, conversationController.deleteConversationLogically);
  .delete(fakeAuthBypass, conversationController.deleteConversationLogically);
/**
 * @swagger
 * /api/v1/conversations/{convId}/read:
 *   put:
 *     tags:
 *       - Conversations
 *     summary: Marcar conversación como leída
 *     description: Resetea el contador 'unreadCount' del usuario autenticado a 0 para esta conversación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: convId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversación.
 *     responses:
 *       '200':
 *         description: Contador de mensajes no leídos reseteado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Conversación marcada como leída."
 *                 updatedConversation:
 *                   $ref: '#/components/schemas/ConversationResponse'
 *       '401':
 *         description: No autorizado
 *       '403':
 *         description: Prohibido
 *       '404':
 *         description: Conversación no encontrada
 */
//router.put('/:convId/read', verifyToken, conversationController.markConversationAsRead);
router.put(
  '/:convId/read',
  fakeAuthBypass,
  conversationController.markConversationAsRead
);

export default router;
