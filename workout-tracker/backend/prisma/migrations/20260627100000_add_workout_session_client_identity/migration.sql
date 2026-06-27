ALTER TABLE "workout_sessions" ADD COLUMN "client_session_id" TEXT;
ALTER TABLE "workout_sessions" ADD COLUMN "plan_name" TEXT;

CREATE UNIQUE INDEX "workout_sessions_user_id_client_session_id_key" ON "workout_sessions"("user_id", "client_session_id");
