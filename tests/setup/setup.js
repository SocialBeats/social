import { beforeEach, vi } from 'vitest';

process.env.NODE_ENV = 'test';

beforeEach(() => {
  vi.clearAllMocks();
});
