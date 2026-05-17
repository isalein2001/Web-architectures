CREATE TABLE "daily_activities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "water_intake_ml" INTEGER NOT NULL DEFAULT 0,
    "water_goal_ml" INTEGER NOT NULL DEFAULT 3000,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "step_goal" INTEGER NOT NULL DEFAULT 10000,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "daily_activities_user_id_date_key" ON "daily_activities"("user_id", "date");

CREATE INDEX "daily_activities_date_idx" ON "daily_activities"("date");
