import {
  sendRequest,
  listReceived,
  listSent,
  respondRequest,
  listFriends,
  removeFriend,
} from '../services/friendshipService.js';

export default function friendshipRoutes(app) {
  app.post('/api/v1/friendships', sendRequest);
  app.get('/api/v1/friendships/received', listReceived);
  app.get('/api/v1/friendships/sent', listSent);
  app.patch('/api/v1/friendships/:id/respond', respondRequest);
  app.get('/api/v1/friends', listFriends);
  app.delete('/api/v1/friends/:id', removeFriend);
}
