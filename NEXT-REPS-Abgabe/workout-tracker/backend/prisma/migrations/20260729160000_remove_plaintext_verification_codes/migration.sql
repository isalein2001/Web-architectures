UPDATE `users`
SET
    `verification_code` = NULL,
    `verification_code_expires_at` = NULL,
    `verification_code_attempts` = 0
WHERE `verification_code` IS NOT NULL;
