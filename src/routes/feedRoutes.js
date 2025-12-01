import { Router } from 'express';
import { getFeed } from '../services/feedService.js';

const router = Router();

router.get('/api/v1/feed', getFeed);

export default router;
