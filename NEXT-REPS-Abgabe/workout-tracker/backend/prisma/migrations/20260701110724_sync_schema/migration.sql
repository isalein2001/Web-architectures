-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `pending_email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `verification_code` VARCHAR(191) NULL,
    `onboarding_completed` BOOLEAN NOT NULL DEFAULT false,
    `height_cm` INTEGER NULL,
    `weight_kg` DOUBLE NULL,
    `gender` VARCHAR(191) NULL,
    `hydration_goal_liters` DOUBLE NULL,
    `fitness_goal` VARCHAR(191) NULL,
    `profile_image` LONGTEXT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_pending_email_key`(`pending_email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `push_subscriptions_endpoint_key`(`endpoint`),
    INDEX `push_subscriptions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `water_intake_ml` INTEGER NOT NULL DEFAULT 0,
    `water_goal_ml` INTEGER NOT NULL DEFAULT 3000,
    `steps` INTEGER NOT NULL DEFAULT 0,
    `step_goal` INTEGER NOT NULL DEFAULT 10000,
    `active_energy_kcal` INTEGER NOT NULL DEFAULT 0,
    `exercise_minutes` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `daily_activities_date_idx`(`date`),
    UNIQUE INDEX `daily_activities_user_id_date_key`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` LONGTEXT NULL,
    `icon_key` VARCHAR(191) NULL,
    `user_id` INTEGER NULL,

    INDEX `plans_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NULL,
    `exercise_name` VARCHAR(191) NOT NULL,
    `target_sets` INTEGER NULL,
    `target_reps` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` VARCHAR(191) NOT NULL,
    `client_session_id` VARCHAR(191) NULL,
    `plan_id` INTEGER NULL,
    `plan_name` VARCHAR(191) NULL,
    `user_id` INTEGER NULL,
    `notes` TEXT NULL,
    `calories_burned` INTEGER NULL,
    `duration_seconds` INTEGER NULL,
    `intensity` VARCHAR(191) NULL,
    `perceived_exertion` INTEGER NULL,

    INDEX `workout_sessions_user_id_idx`(`user_id`),
    UNIQUE INDEX `workout_sessions_user_id_client_session_id_key`(`user_id`, `client_session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NULL,
    `exercise_name` VARCHAR(191) NOT NULL,
    `set_number` INTEGER NULL,
    `reps` INTEGER NULL,
    `weight` DOUBLE NULL,
    `rest_seconds` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activities` ADD CONSTRAINT `daily_activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plans` ADD CONSTRAINT `plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_exercises` ADD CONSTRAINT `plan_exercises_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_logs` ADD CONSTRAINT `workout_logs_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
