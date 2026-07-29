const jwt = require('jsonwebtoken');
const { prisma } = require('../prismaClient');
const {
  AUTH_COOKIE_NAME,
  authenticate,
  ensureEmailVerified,
  getAuthCookieOptions,
} = require('../middleware/authenticate');

const createResponse = () => {
  const res = {
    clearCookie: vi.fn(),
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('authentication middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  test('uses secure cookies only in production', () => {
    process.env.NODE_ENV = 'development';
    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    process.env.NODE_ENV = 'production';
    expect(getAuthCookieOptions().secure).toBe(true);
  });

  test('rejects requests without a token', async () => {
    const req = { cookies: {}, get: vi.fn() };
    const res = createResponse();

    await authenticate(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Nicht autorisiert.' });
  });

  test('loads an authenticated user from a bearer token', async () => {
    const token = jwt.sign({ userId: 7, role: 'user' }, process.env.JWT_SECRET);
    const req = {
      cookies: {},
      get: vi.fn().mockReturnValue(`Bearer ${token}`),
    };
    const res = createResponse();
    const next = vi.fn();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      emailVerified: true,
      onboardingCompleted: false,
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({
      userId: 7,
      email: 'test@example.com',
      emailVerified: true,
      onboardingCompleted: false,
    });
  });

  test('rejects an invalid token and clears its cookie', async () => {
    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'invalid' },
      get: vi.fn(),
    };
    const res = createResponse();

    await authenticate(req, res, vi.fn());

    expect(res.clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects unverified users and accepts verified users', () => {
    const blockedResponse = createResponse();
    ensureEmailVerified({ user: { emailVerified: false } }, blockedResponse, vi.fn());
    expect(blockedResponse.status).toHaveBeenCalledWith(403);

    const next = vi.fn();
    ensureEmailVerified({ user: { emailVerified: true } }, createResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
