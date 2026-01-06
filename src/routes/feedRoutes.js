import { getFeed } from '../services/feedService.js';

export default function feedRoutes(app) {
  /**
   * @swagger
   * /api/v1/feed:
   *   get:
   *     tags:
   *       - Feed
   *     summary: Get social feed for authenticated user
   *     description: >
   *       Returns a paginated social feed containing events from friends and network activities
   *       (friendships, comments, ratings, beats, etc.). Feed items are sorted by creation date.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: >-
   *           User ID (optional, can also use x-user-id header from gateway).
   *           If not provided, uses authenticated user ID.
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Page number for pagination (zero-indexed).
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of items per page (max 100).
   *     responses:
   *       '200':
   *         description: Paginated feed items retrieved successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedFeed'
   *       '400':
   *         description: Invalid or missing user ID.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingUserId:
   *                 value:
   *                   message: Invalid or missing userId
   *       '500':
   *         description: Server error retrieving feed.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               serverError:
   *                 value:
   *                   message: Server error
   */
  app.get('/api/v1/feed', getFeed);
}
