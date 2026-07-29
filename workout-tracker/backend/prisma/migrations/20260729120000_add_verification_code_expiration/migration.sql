ALTER TABLE `users`
    ADD COLUMN `verification_code_expires_at` DATETIME(3) NULL,
    ADD COLUMN `verification_code_attempts` INTEGER NOT NULL DEFAULT 0;
