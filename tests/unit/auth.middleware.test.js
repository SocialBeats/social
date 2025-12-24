import { describe, it, expect, vi } from 'vitest';
import extractUserFromHeader from '../../src/middlewares/authMiddlewares.js';

// Helper to create mock request object
const makeReq = (path, headers = {}) => ({
  path,
  headers,
});

// Helper to create mock response object
const makeRes = () => {
  const res = {};
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

// Helper to create mock next function
const makeNext = () => vi.fn();

describe('extractUserFromHeader middleware', () => {
  it('should allow open paths without x-user-id header', () => {
    const openPaths = [
      '/api/v1/health',
      '/api/v1/about',
      '/api/v1/changelog',
      '/api/v1/version',
      '/api/v1/docs/swagger',
    ];

    openPaths.forEach((path) => {
      const req = makeReq(path);
      const res = makeRes();
      const next = makeNext();

      extractUserFromHeader(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('should return 400 for paths without API version', () => {
    const req = makeReq('/some/path');
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/API version/);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when x-user-id header is missing', () => {
    const req = makeReq('/api/v1/friends');
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Missing x-user-id/);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when x-user-id has invalid format (too short)', () => {
    const req = makeReq('/api/v1/friends', { 'x-user-id': '12345' });
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Invalid x-user-id/);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when x-user-id has invalid format (non-hex)', () => {
    const req = makeReq('/api/v1/friends', {
      'x-user-id': 'zzzzzzzzzzzzzzzzzzzzzzzz',
    });
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Invalid x-user-id/);
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach user to req.user.sub and call next() with valid x-user-id', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const req = makeReq('/api/v1/friends', { 'x-user-id': validUserId });
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(req.user).toEqual({ sub: validUserId });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should accept valid ObjectId with uppercase hex characters', () => {
    const validUserId = '507F1F77BCF86CD799439011';
    const req = makeReq('/api/v1/friends', { 'x-user-id': validUserId });
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(req.user).toEqual({ sub: validUserId });
    expect(next).toHaveBeenCalled();
  });

  it('should accept valid ObjectId with mixed case', () => {
    const validUserId = '507f1F77BcF86cD799439011';
    const req = makeReq('/api/v1/friendships', { 'x-user-id': validUserId });
    const res = makeRes();
    const next = makeNext();

    extractUserFromHeader(req, res, next);

    expect(req.user).toEqual({ sub: validUserId });
    expect(next).toHaveBeenCalled();
  });
});
