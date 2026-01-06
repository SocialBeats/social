import {
  sendRequest,
  listReceived,
  listSent,
  respondRequest,
  listFriends,
  removeFriend,
} from '../services/friendshipService.js';

export default function friendshipRoutes(app) {
  app.post('/api/v1/social/friendships', sendRequest);
  app.get('/api/v1/social/friendships/received', listReceived);
  app.get('/api/v1/social/friendships/sent', listSent);
  app.patch('/api/v1/social/friendships/:id/respond', respondRequest);
  app.get('/api/v1/social/friends', listFriends);
  app.delete('/api/v1/social/friends/:id', removeFriend);
}
