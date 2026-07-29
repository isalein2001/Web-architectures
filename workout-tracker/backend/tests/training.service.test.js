const {
  serializeExercise,
  serializePlan,
  toNumberId,
  validateExerciseInput,
} = require('../modules/training/training.service');

describe('training service helpers', () => {
  test.each([
    [1, 1],
    ['42', 42],
    [0, 0],
    ['1.5', null],
    ['not-a-number', null],
  ])('normalizes plan id %j to %j', (input, expected) => {
    expect(toNumberId(input)).toBe(expected);
  });

  test('serializes exercises to the public API contract', () => {
    expect(serializeExercise({
      id: 4,
      planId: 2,
      exerciseName: 'Squat',
      targetSets: 4,
      targetReps: '8',
    })).toEqual({
      id: 4,
      plan_id: 2,
      exercise_name: 'Squat',
      target_sets: 4,
      target_reps: '8',
    });
  });

  test('serializes a plan and defaults missing exercises to an empty list', () => {
    expect(serializePlan({
      id: 2,
      name: 'Leg day',
      description: 'Heavy',
      image: null,
      iconKey: 'bolt',
    })).toEqual({
      id: 2,
      name: 'Leg day',
      description: 'Heavy',
      image: null,
      icon_key: 'bolt',
      exercises: [],
    });
  });

  test.each([
    [{}, 'Exercise name is required'],
    [{ exercise_name: 12 }, 'Exercise name is required'],
    [{ exercise_name: 'Squat', target_sets: 'many' }, 'Target sets must be a number'],
    [{ exercise_name: 'Squat', target_sets: '4' }, null],
    [{ exercise_name: 'Squat', target_sets: null }, null],
  ])('validates exercise input %#', (input, expected) => {
    expect(validateExerciseInput(input)).toBe(expected);
  });
});
