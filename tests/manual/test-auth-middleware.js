// Simple standalone test for the authentication middleware
// Run with: node tests/manual/test-auth-middleware.js

import extractUserFromHeader from '../../src/middlewares/authMiddlewares.js';

// Helper to create mock request object
const makeReq = (path, headers = {}) => ({
  path,
  headers,
});

// Helper to create mock response object
const makeRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

// Test counter
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toMatch(regex) {
      if (!regex.test(actual)) {
        throw new Error(`Expected ${actual} to match ${regex}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
        );
      }
    },
    toHaveBeenCalled() {
      if (!actual.called) {
        throw new Error('Expected function to have been called');
      }
    },
    not: {
      toHaveBeenCalled() {
        if (actual.called) {
          throw new Error('Expected function not to have been called');
        }
      },
    },
  };
}

const makeNext = () => {
  const fn = () => {
    fn.called = true;
  };
  fn.called = false;
  return fn;
};

console.log('\n🧪 Testing extractUserFromHeader middleware\n');

test('should allow /api/v1/health without x-user-id header', () => {
  const req = makeReq('/api/v1/health');
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(next).toHaveBeenCalled();
});

test('should allow /api/v1/docs/ without x-user-id header', () => {
  const req = makeReq('/api/v1/docs/swagger');
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(next).toHaveBeenCalled();
});

test('should return 400 for paths without API version', () => {
  const req = makeReq('/some/path');
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toMatch(/API version/);
  expect(next).not.toHaveBeenCalled();
});

test('should return 401 when x-user-id header is missing', () => {
  const req = makeReq('/api/v1/friends');
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toMatch(/Missing x-user-id/);
  expect(next).not.toHaveBeenCalled();
});

test('should return 401 when x-user-id has invalid format (too short)', () => {
  const req = makeReq('/api/v1/friends', { 'x-user-id': '12345' });
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toMatch(/Invalid x-user-id/);
  expect(next).not.toHaveBeenCalled();
});

test('should return 401 when x-user-id has invalid format (non-hex)', () => {
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

test('should attach user to req.user.sub with valid x-user-id', () => {
  const validUserId = '507f1f77bcf86cd799439011';
  const req = makeReq('/api/v1/friends', { 'x-user-id': validUserId });
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(req.user).toEqual({ sub: validUserId });
  expect(next).toHaveBeenCalled();
});

test('should accept valid ObjectId with uppercase hex', () => {
  const validUserId = '507F1F77BCF86CD799439011';
  const req = makeReq('/api/v1/friends', { 'x-user-id': validUserId });
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(req.user).toEqual({ sub: validUserId });
  expect(next).toHaveBeenCalled();
});

test('should work with friendship endpoints', () => {
  const validUserId = '507f1f77bcf86cd799439011';
  const req = makeReq('/api/v1/friendships', { 'x-user-id': validUserId });
  const res = makeRes();
  const next = makeNext();

  extractUserFromHeader(req, res, next);

  expect(req.user).toEqual({ sub: validUserId });
  expect(next).toHaveBeenCalled();
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
