ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" ADD COLUMN "verification_code" TEXT;

ALTER TABLE "users" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" ADD COLUMN "height_cm" INTEGER;

ALTER TABLE "users" ADD COLUMN "weight_kg" REAL;

ALTER TABLE "users" ADD COLUMN "hydration_goal_liters" REAL;

ALTER TABLE "users" ADD COLUMN "fitness_goal" TEXT;
