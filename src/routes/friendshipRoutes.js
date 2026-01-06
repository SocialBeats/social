import {
  sendRequest,
  listReceived,
  listSent,
  respondRequest,
  listFriends,
  removeFriend,
} from '../services/friendshipService.js';

export default function friendshipRoutes(app) {
  /**
   * @swagger
   * /api/v1/friendships:
   *   post:
   *     tags:
   *       - Friendships
   *     summary: Send a friendship request
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/FriendshipRequest'
   *     responses:
   *       '201':
   *         description: Friendship request created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Friendship'
   *       '200':
   *         description: Friendship request reactivated or auto-accepted
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Friendship'
   *       '400':
   *         description: Invalid user id or self-request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '404':
   *         description: Recipient not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '409':
   *         description: Duplicate or pending request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.post('/api/v1/friendships', sendRequest);

  /**
   * @swagger
   * /api/v1/friendships/received:
   *   get:
   *     tags:
   *       - Friendships
   *     summary: List pending friendship requests received
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Pending requests
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Friendship'
   *       '400':
   *         description: Invalid user id
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get('/api/v1/friendships/received', listReceived);

  /**
   * @swagger
   * /api/v1/friendships/sent:
   *   get:
   *     tags:
   *       - Friendships
   *     summary: List pending friendship requests sent
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Sent requests
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Friendship'
   *       '400':
   *         description: Invalid user id
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get('/api/v1/friendships/sent', listSent);

  /**
   * @swagger
   * /api/v1/friendships/{id}/respond:
   *   patch:
   *     tags:
   *       - Friendships
   *     summary: Accept or reject a friendship request
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Friendship request id
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/FriendshipRespondRequest'
   *     responses:
   *       '200':
   *         description: Request processed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Friendship'
   *       '400':
   *         description: Invalid id or action
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '403':
   *         description: Not allowed to respond to this request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '404':
   *         description: Request not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '409':
   *         description: Request already processed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.patch('/api/v1/friendships/:id/respond', respondRequest);

  /**
   * @swagger
   * /api/v1/friends:
   *   get:
   *     tags:
   *       - Friendships
   *     summary: List accepted friends for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Friends list
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FriendsResponse'
   *       '400':
   *         description: Invalid user id
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get('/api/v1/friends', listFriends);

  /**
   * @swagger
   * /api/v1/friends/{id}:
   *   delete:
   *     tags:
   *       - Friendships
   *     summary: Remove an existing friend
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Friend user id
   *     responses:
   *       '200':
   *         description: Friendship removed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Friendship removed
   *       '400':
   *         description: Invalid id
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '403':
   *         description: Not authorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '404':
   *         description: Friendship not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '500':
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.delete('/api/v1/friends/:id', removeFriend);
}
