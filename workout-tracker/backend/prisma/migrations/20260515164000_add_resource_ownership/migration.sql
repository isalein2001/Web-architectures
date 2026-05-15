ALTER TABLE "plans" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "workout_sessions" ADD COLUMN "user_id" INTEGER;

CREATE INDEX "plans_user_id_idx" ON "plans"("user_id");

CREATE INDEX "workout_sessions_user_id_idx" ON "workout_sessions"("user_id");
