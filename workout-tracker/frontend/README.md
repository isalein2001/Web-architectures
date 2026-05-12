# Workout Tracker

React/Vite frontend with an Express.js + SQLite backend.

The project keeps frontend and backend separate:

- `frontend/`: React + Vite UI
- `backend/`: Express API with SQLite persistence
- `backend/database.sqlite`: local SQLite database
- `backend/database.js`: database initialization and schema creation
- `backend/server.js`: Express app setup and route mounting
- `backend/routes/`: resource-specific API route modules

## API Architecture

The backend uses a small REST-style API under `/api`. Existing frontend behavior is preserved: the frontend still calls the established `/api/plans`, `/api/sessions`, `/api/progress/:exercise_name`, and `/api/stats` paths.

Workout plans are the main persisted workout resource. The route implementation lives in `backend/routes/workouts.js` and is mounted at both:

- `/api/plans` for backward compatibility with the existing frontend
- `/api/workouts` as a clearer resource alias

SQLite persistence is unchanged. The schema still uses:

- `plans`
- `plan_exercises`
- `workout_sessions`
- `workout_logs`

Foreign key enforcement is enabled with `PRAGMA foreign_keys = ON`, so cascade behavior defined in the schema is respected by SQLite.

## Resources

### Workouts / Plans

Persisted in `plans` and `plan_exercises`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/plans` | List all workout plans with exercises | `200` |
| `GET` | `/api/plans/:id` | Get one workout plan with exercises | `200` |
| `POST` | `/api/plans` | Create a workout plan | `201` |
| `PUT` | `/api/plans/:id` | Fully replace/update a workout plan | `200` |
| `DELETE` | `/api/plans/:id` | Delete a workout plan | `204` |
| `GET` | `/api/workouts` | Alias for listing workout plans | `200` |
| `GET` | `/api/workouts/:id` | Alias for one workout plan | `200` |
| `POST` | `/api/workouts` | Alias for creating a workout plan | `201` |
| `PUT` | `/api/workouts/:id` | Alias for fully replacing/updating a workout plan | `200` |
| `DELETE` | `/api/workouts/:id` | Alias for deleting a workout plan | `204` |

Validation:

- Missing `name` returns `400`
- Invalid `exercises` payload returns `400`
- Unknown workout/plan id returns `404`

### Nested Resource: Plan Exercises

Exercises are the second API resource and are nested under their parent workout plan. This mirrors the database relationship: every row in `plan_exercises` belongs to one row in `plans`.

The same nested routes are available through the `/api/workouts/:workoutId/exercises` alias because `/api/workouts` and `/api/plans` use the same router.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/plans/:planId/exercises` | List exercises for one workout plan | `200` |
| `GET` | `/api/plans/:planId/exercises/:exerciseId` | Get one exercise inside one workout plan | `200` |
| `POST` | `/api/plans/:planId/exercises` | Create an exercise inside one workout plan | `201` |
| `PUT` | `/api/plans/:planId/exercises/:exerciseId` | Fully replace/update one nested exercise | `200` |
| `DELETE` | `/api/plans/:planId/exercises/:exerciseId` | Delete one nested exercise | `204` |

Validation:

- Missing `exercise_name` returns `400`
- Invalid `target_sets` returns `400`
- Unknown parent workout/plan id returns `404`
- Unknown nested exercise id returns `404`

### Sessions

Persisted in `workout_sessions` and `workout_logs`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/sessions` | List recent workout sessions with logs | `200` |
| `POST` | `/api/sessions` | Log a workout session | `201` |
| `DELETE` | `/api/sessions/:id` | Delete a logged workout session | `204` |

Validation:

- Missing `date` returns `400`
- Invalid `logs` payload returns `400`
- Unknown session id returns `404`

### Progress

Computed from logged workout sets.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/progress/:exercise_name` | Get logged progress for one exercise | `200` |

### Stats

Computed from workout sessions.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/stats` | Get total sessions and session dates | `200` |

### Calendar Entries, Hydration Goals, BMI Records

These features currently exist in the frontend and are stored in `localStorage`:

- calendar entries: `workoutSchedule`
- custom frontend workout cards: `customWorkoutPlans`
- hydration goal: `hydrationGoalLiters`
- BMI/profile data: `profileGender`, `profileHeightCm`, `profileWeightKg`, `profileBmi`, `bmiTrackingEnabled`

They are not currently persisted through the Express/SQLite API. This was intentionally left unchanged to avoid breaking existing frontend behavior.

## HTTP Status Codes

The API follows these status conventions:

- `200`: successful `GET`
- `201`: successful create
- `204`: successful delete without response body
- `400`: invalid or missing input
- `404`: requested resource was not found
- `500`: unexpected server/database error

## Refactor Notes

The backend was refactored minimally:

- Route handlers were moved out of `server.js`.
- Workout/plan handlers now live in `backend/routes/workouts.js`.
- Session handlers now live in `backend/routes/sessions.js`.
- Progress handlers now live in `backend/routes/progress.js`.
- Stats handlers now live in `backend/routes/stats.js`.
- Existing frontend API paths were preserved.
- SQLite persistence and schema were preserved.
- Input validation was added where missing.
- `PUT` endpoints fully replace existing workout plans and their exercises.
- `DELETE` endpoints were added for workout plans and sessions.
- Nested exercise endpoints were added under workout plans as a second REST resource.

No frontend architecture was replaced, and no existing database functionality was removed.

## Prompt Iterations

### Iteration 1: Backend REST Refactor

The first backend prompt focused on preserving the existing app while improving API structure:

- Analyze the existing backend before changing code.
- Preserve the React/Vite frontend and Express/SQLite backend architecture.
- Keep existing frontend behavior and existing API paths working.
- Move route handlers out of `server.js` into separate route files.
- Preserve SQLite persistence and the existing database flow.
- Document resources, CRUD endpoints, architecture decisions and status codes.

### Iteration 2: Missing Update Endpoint

The second backend prompt added the missing update operation for the main resource:

- Add `PUT /api/plans/:id`.
- Add `PUT /api/workouts/:id` as an alias.
- Return `200` with the updated plan.
- Return `400` for invalid input and `404` for missing plans.
- Keep existing frontend API paths unchanged.
- Verify valid and invalid requests manually.

### Iteration 3: Nested Second Resource

The third backend prompt completed the bonus REST requirement:

- Add nested `plan_exercises` endpoints under `/api/plans/:planId/exercises`.
- Keep the `/api/workouts/:workoutId/exercises` alias available through the same router.
- Test nested create, read, update and delete behavior.
- Keep the frontend unchanged.

## Verification

Backend checks:

- `node --check server.js`
- `node --check routes/workouts.js`
- `node --check routes/sessions.js`
- `node --check routes/progress.js`
- local Express startup on test port `3100`
- `GET /api/plans` -> `200`
- `GET /api/stats` -> `200`
- invalid `POST /api/plans` -> `400`
- missing `GET /api/plans/:id` -> `404`
- valid `POST /api/plans` -> `201`
- valid `PUT /api/plans/:id` -> `200`
- invalid `PUT /api/plans/:id` -> `400`
- valid `PUT /api/workouts/:id` -> `200`
- valid `POST /api/plans/:planId/exercises` -> `201`
- valid `GET /api/plans/:planId/exercises` -> `200`
- valid `PUT /api/plans/:planId/exercises/:exerciseId` -> `200`
- invalid `POST /api/plans/:planId/exercises` -> `400`
- missing `GET /api/plans/:planId/exercises/:exerciseId` -> `404`
- valid `DELETE /api/plans/:planId/exercises/:exerciseId` -> `204`
- `DELETE /api/plans/:id` -> `204`

Frontend check:

- `npm run build`

The frontend still uses the same API client paths in `frontend/src/api.js`.

## Frontend Development

This frontend is based on React + Vite and supports HMR during development.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
