CREATE TABLE `product_analytics_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `event_name` VARCHAR(64) NOT NULL,
  `client_event_id` VARCHAR(64) NOT NULL,
  `source` VARCHAR(16) NOT NULL DEFAULT 'web',
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `product_analytics_events_client_event_id_key`(`client_event_id`),
  INDEX `product_analytics_events_user_id_created_at_idx`(`user_id`, `created_at`),
  INDEX `product_analytics_events_event_name_created_at_idx`(`event_name`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `product_analytics_events_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
