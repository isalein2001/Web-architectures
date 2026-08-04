process.env.JWT_SECRET = 'integration-test-secret';
process.env.NODE_ENV = 'test';
process.env.SMTP_PASSWORD = '';
process.env.VAPID_PUBLIC_KEY = '';
process.env.VAPID_PRIVATE_KEY = '';

const crypto = require('crypto');
const request = require('supertest');
const app = require('../server');
const { prisma } = require('../prismaClient');

const CSRF_HEADER = 'X-NextReps-CSRF';
const TEST_EMAIL = 'vitest-integration@next-reps.invalid';
const CHANGED_EMAIL = 'vitest-integration-changed@next-reps.invalid';
const TEST_PASSWORD = 'Integration1';
const VERIFICATION_CODE = '123456';

describe.sequential('critical API user journey', () => {
  const agent = request.agent(app);
  let userId;
  let planId;
  let firstExerciseId;
  let secondExerciseId;
  let sessionId;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: TEST_EMAIL },
          { email: CHANGED_EMAIL },
          { pendingEmail: CHANGED_EMAIL },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: TEST_EMAIL },
          { email: CHANGED_EMAIL },
          { pendingEmail: CHANGED_EMAIL },
        ],
      },
    });
    await prisma.$disconnect();
  });

  test('protects registration validation and creates a user', async () => {
    const weakPassword = await agent
      .post('/api/auth/register')
      .set(CSRF_HEADER, '1')
      .send({
        email: TEST_EMAIL,
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      });
    expect(weakPassword.status).toBe(400);

    const response = await agent
      .post('/api/auth/register')
      .set(CSRF_HEADER, '1')
      .send({
        email: TEST_EMAIL.toUpperCase(),
        password: TEST_PASSWORD,
        firstName: ' Test ',
        lastName: ' User ',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: TEST_EMAIL,
      firstName: 'Test',
      lastName: 'User',
      emailVerified: false,
    });
    expect(response.body.token).toEqual(expect.any(String));
    userId = response.body.user.id;

    const storedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(storedUser.passwordHash).not.toBe(TEST_PASSWORD);
    expect(storedUser.verificationCode).toMatch(/^[a-f0-9]{64}$/);
  });

  test('rejects invalid login credentials and restores a valid session', async () => {
    const invalid = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER, '1')
      .send({ email: TEST_EMAIL, password: 'WrongPassword1' });
    expect(invalid.status).toBe(401);

    const valid = await agent
      .post('/api/auth/login')
      .set(CSRF_HEADER, '1')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(valid.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(userId);
  });

  test('limits verification attempts and verifies the correct code', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: crypto
          .createHash('sha256')
          .update(VERIFICATION_CODE)
          .digest('hex'),
        verificationCodeExpiresAt: new Date(Date.now() + 60_000),
        verificationCodeAttempts: 0,
      },
    });

    const invalid = await agent
      .post('/api/auth/verify-email')
      .set(CSRF_HEADER, '1')
      .send({ code: '000000' });
    expect(invalid.status).toBe(400);

    const valid = await agent
      .post('/api/auth/verify-email')
      .set(CSRF_HEADER, '1')
      .send({ code: VERIFICATION_CODE });
    expect(valid.status).toBe(200);
    expect(valid.body.user.emailVerified).toBe(true);
  });

  test('validates and stores onboarding data', async () => {
    const invalid = await agent
      .post('/api/auth/onboarding')
      .set(CSRF_HEADER, '1')
      .send({
        heightCm: 20,
        weightKg: 70,
        gender: 'Other',
        hydrationGoalLiters: 3,
        fitnessGoal: 'muscle_gain',
      });
    expect(invalid.status).toBe(400);

    const valid = await agent
      .post('/api/auth/onboarding')
      .set(CSRF_HEADER, '1')
      .send({
        heightCm: 170,
        weightKg: 70,
        gender: 'Other',
        hydrationGoalLiters: 3,
        fitnessGoal: 'muscle_gain',
      });
    expect(valid.status).toBe(200);
    expect(valid.body.user.onboardingCompleted).toBe(true);
  });

  test('creates, reads and updates an owned workout plan', async () => {
    const invalid = await agent
      .post('/api/plans')
      .set(CSRF_HEADER, '1')
      .send({ name: '', exercises: [] });
    expect(invalid.status).toBe(400);

    const created = await agent
      .post('/api/plans')
      .set(CSRF_HEADER, '1')
      .send({
        name: ' Integration Plan ',
        description: 'API coverage',
        icon_key: ' dumbbell ',
        exercises: [{
          exercise_name: 'Squat',
          target_sets: 3,
          target_reps: '8',
        }],
      });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Integration Plan');
    expect(created.body.exercises).toHaveLength(1);
    planId = created.body.id;
    firstExerciseId = created.body.exercises[0].id;

    const fetched = await agent.get(`/api/plans/${planId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(planId);

    const updated = await agent
      .put(`/api/plans/${planId}`)
      .set(CSRF_HEADER, '1')
      .send({
        name: 'Updated Plan',
        description: 'Updated',
        exercises: [{
          exercise_name: 'Squat',
          target_sets: 4,
          target_reps: '6',
        }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Updated Plan');
    firstExerciseId = updated.body.exercises[0].id;
  });

  test('supports the nested exercise lifecycle', async () => {
    const created = await agent
      .post(`/api/plans/${planId}/exercises`)
      .set(CSRF_HEADER, '1')
      .send({
        exercise_name: 'Bench Press',
        target_sets: 3,
        target_reps: '10',
      });
    expect(created.status).toBe(201);
    secondExerciseId = created.body.id;

    const list = await agent.get(`/api/plans/${planId}/exercises`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);

    const fetched = await agent.get(`/api/plans/${planId}/exercises/${secondExerciseId}`);
    expect(fetched.status).toBe(200);

    const updated = await agent
      .put(`/api/plans/${planId}/exercises/${secondExerciseId}`)
      .set(CSRF_HEADER, '1')
      .send({
        exercise_name: 'Bench Press',
        target_sets: 5,
        target_reps: '5',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.target_sets).toBe(5);

    const removed = await agent
      .delete(`/api/plans/${planId}/exercises/${secondExerciseId}`)
      .set(CSRF_HEADER, '1');
    expect(removed.status).toBe(204);
  });

  test('stores an idempotent workout session with logs', async () => {
    const invalid = await agent
      .post('/api/sessions')
      .set(CSRF_HEADER, '1')
      .send({ logs: [] });
    expect(invalid.status).toBe(400);

    const payload = {
      date: '2026-07-29',
      client_session_id: 'vitest-session-1',
      plan_id: planId,
      plan_name: 'Updated Plan',
      notes: 'Integration test',
      calories_burned: 320,
      duration_seconds: 2700,
      intensity: 'intense',
      perceived_exertion: 8,
      logs: [{
        exercise_name: 'Squat',
        set_number: 1,
        reps: 6,
        weight: 80,
        rest_seconds: 120,
      }],
    };

    const created = await agent
      .post('/api/sessions')
      .set(CSRF_HEADER, '1')
      .send(payload);
    expect(created.status).toBe(201);
    expect(created.body.logs).toHaveLength(1);
    sessionId = created.body.id;

    const duplicate = await agent
      .post('/api/sessions')
      .set(CSRF_HEADER, '1')
      .send(payload);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.id).toBe(sessionId);

    const sessions = await agent.get('/api/sessions');
    expect(sessions.status).toBe(200);
    expect(sessions.body.some((session) => session.id === sessionId)).toBe(true);
  });

  test('derives statistics and progress from the stored session', async () => {
    const stats = await agent.get('/api/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.totalSessions).toBe(1);

    const progress = await agent.get('/api/progress/Squat');
    expect(progress.status).toBe(200);
    expect(progress.body[0]).toMatchObject({
      exercise_name: 'Squat',
      weight: 80,
      date: '2026-07-29',
    });

    const coach = await agent.get('/api/coach/analysis');
    expect(coach.status).toBe(200);
    expect(coach.body.engine).toBe('NEXT_REPS_RULE_COACH_V1');
    expect(coach.body.summary).toMatchObject({
      sessionCount30: 1,
      totalSets30: 1,
      planCount: 1,
    });
    expect(coach.body.recommendations.length).toBeGreaterThan(0);
    expect(coach.body.suggestedWeek).toHaveLength(3);
  });

  test('validates and updates daily activity', async () => {
    const invalid = await agent
      .patch('/api/daily-activity/today')
      .set(CSRF_HEADER, '1')
      .send({ steps: -1 });
    expect(invalid.status).toBe(400);

    const updated = await agent
      .patch('/api/daily-activity/today')
      .set(CSRF_HEADER, '1')
      .send({
        date: '2026-07-29',
        water_intake_ml: 500,
        water_goal_ml: 3000,
        steps: 4000,
        step_goal: 10000,
        active_energy_kcal: 450,
        exercise_minutes: 45,
      });
    expect(updated.status).toBe(200);

    const water = await agent
      .post('/api/daily-activity/today/water')
      .set(CSRF_HEADER, '1')
      .send({ date: '2026-07-29', amountMl: 250 });
    expect(water.status).toBe(200);
    expect(water.body.water_intake_ml).toBe(750);

    const steps = await agent
      .post('/api/daily-activity/today/steps')
      .set(CSRF_HEADER, '1')
      .send({ date: '2026-07-29', amount: 1000 });
    expect(steps.status).toBe(200);
    expect(steps.body.steps).toBe(5000);

    const fetched = await agent.get('/api/daily-activity/today?date=2026-07-29');
    expect(fetched.status).toBe(200);
    expect(fetched.body.exercise_minutes).toBe(45);
  });

  test('validates profile updates and preserves the field allowlist', async () => {
    const invalid = await agent
      .put('/api/auth/me')
      .set(CSRF_HEADER, '1')
      .send({
        email: TEST_EMAIL,
        firstName: 'Test',
        lastName: 'User',
        gender: 'Invalid',
      });
    expect(invalid.status).toBe(400);

    const valid = await agent
      .put('/api/auth/me')
      .set(CSRF_HEADER, '1')
      .send({
        email: TEST_EMAIL,
        firstName: 'Updated',
        lastName: 'User',
        gender: 'Female',
        emailVerified: false,
      });
    expect(valid.status).toBe(200);
    expect(valid.body.user.firstName).toBe('Updated');

    const storedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(storedUser.emailVerified).toBe(true);

    const profileImage = await agent.get('/api/auth/me/profile-image');
    expect(profileImage.status).toBe(200);
    expect(profileImage.body.profileImage).toBeNull();
  });

  test('keeps an email change pending until its code is verified', async () => {
    const requested = await agent
      .put('/api/auth/me')
      .set(CSRF_HEADER, '1')
      .send({
        email: CHANGED_EMAIL,
        firstName: 'Updated',
        lastName: 'User',
      });
    expect(requested.status).toBe(200);
    expect(requested.body.user).toMatchObject({
      email: TEST_EMAIL,
      pendingEmail: CHANGED_EMAIL,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: crypto
          .createHash('sha256')
          .update(VERIFICATION_CODE)
          .digest('hex'),
        verificationCodeExpiresAt: new Date(Date.now() + 60_000),
        verificationCodeAttempts: 0,
      },
    });

    const invalid = await agent
      .post('/api/auth/verify-email-change')
      .set(CSRF_HEADER, '1')
      .send({ code: '000000' });
    expect(invalid.status).toBe(400);

    const verified = await agent
      .post('/api/auth/verify-email-change')
      .set(CSRF_HEADER, '1')
      .send({ code: VERIFICATION_CODE });
    expect(verified.status).toBe(200);
    expect(verified.body.user).toMatchObject({
      email: CHANGED_EMAIL,
      pendingEmail: null,
      emailVerified: true,
    });
  });

  test('validates push configuration and subscriptions', async () => {
    const publicKey = await agent.get('/api/push/public-key');
    expect(publicKey.status).toBe(503);

    const invalid = await agent
      .post('/api/push/subscribe')
      .set(CSRF_HEADER, '1')
      .send({ subscription: {} });
    expect(invalid.status).toBe(400);

    const valid = await agent
      .post('/api/push/subscribe')
      .set(CSRF_HEADER, '1')
      .send({
        subscription: {
          endpoint: 'https://push.next-reps.invalid/vitest',
          keys: {
            p256dh: 'vitest-p256dh',
            auth: 'vitest-auth',
          },
        },
      });
    expect(valid.status).toBe(201);
  });

  test('validates, stores and returns only owned product analytics events', async () => {
    const unknownEvent = await agent
      .post('/api/product-analytics')
      .set(CSRF_HEADER, '1')
      .send({
        eventName: 'password_entered',
        clientEventId: 'vitest-event-0001',
      });
    expect(unknownEvent.status).toBe(400);

    const invalidEventId = await agent
      .post('/api/product-analytics')
      .set(CSRF_HEADER, '1')
      .send({
        eventName: 'workout_completed',
        clientEventId: 'too-short',
      });
    expect(invalidEventId.status).toBe(400);

    const created = await agent
      .post('/api/product-analytics')
      .set(CSRF_HEADER, '1')
      .send({
        eventName: 'workout_completed',
        clientEventId: 'vitest-event-0001',
        source: 'app',
        metadata: {
          exerciseCount: 2,
          setCount: '6',
          hasPlan: true,
          notes: 'must not be stored',
        },
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      eventName: 'workout_completed',
      source: 'app',
      metadata: {
        exerciseCount: 2,
        setCount: 6,
        hasPlan: true,
      },
    });
    expect(created.body.metadata.notes).toBeUndefined();

    const duplicate = await agent
      .post('/api/product-analytics')
      .set(CSRF_HEADER, '1')
      .send({
        eventName: 'workout_completed',
        clientEventId: 'vitest-event-0001',
      });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.id).toBe(created.body.id);

    const ownEvents = await agent.get('/api/product-analytics/me');
    expect(ownEvents.status).toBe(200);
    expect(ownEvents.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          eventName: 'workout_completed',
        }),
      ])
    );
  });

  test('deletes owned resources and invalidates the session on logout', async () => {
    const removedSession = await agent
      .delete(`/api/sessions/${sessionId}`)
      .set(CSRF_HEADER, '1');
    expect(removedSession.status).toBe(204);

    const removedPlan = await agent
      .delete(`/api/plans/${planId}`)
      .set(CSRF_HEADER, '1');
    expect(removedPlan.status).toBe(204);

    const logout = await agent
      .post('/api/auth/logout')
      .set(CSRF_HEADER, '1');
    expect(logout.status).toBe(204);

    const protectedResponse = await agent.get('/api/plans');
    expect(protectedResponse.status).toBe(401);
  });
});
