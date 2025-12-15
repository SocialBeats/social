import { Router } from 'express';

import { fakeAuth } from '../middlewares/fakeAuth.js';
import { makeMessagingController } from '../controllers/messagingController.js';

export default function messagingRoutes(app, io) {
  const router = Router();
  const controller = makeMessagingController(io);

  // Aplica fakeAuth a todas las rutas de mensajería
  router.use(fakeAuth);

  // Conversaciones
  router.post('/conversations/direct', controller.upsertDirectConversation);
  router.get('/conversations', controller.listConversations);

  // Mensajes
  router.get('/conversations/:id/messages', controller.listMessages);
  router.post('/conversations/:id/messages', controller.sendMessage);

  // Monta este router bajo un prefijo común (respeta tu convención /api/v1)
  app.use('/api/v1/social', router);
}
