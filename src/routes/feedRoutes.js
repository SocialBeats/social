import { getFeed } from '../services/feedService.js';

export default function feedRoutes(app) {
  app.get('/api/v1/feed', getFeed);
}
