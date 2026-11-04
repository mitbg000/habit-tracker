-- ==========================================================
--  Habit Tracker — cấu trúc database MySQL / MariaDB
--  Import file này vào database đã tạo trên aaPanel
--  (aaPanel > Databases > Import, hoặc phpMyAdmin > Import).
--  Không bắt buộc: ứng dụng tự tạo bảng khi khởi động nếu chưa có.
-- ==========================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(32) NOT NULL,
  `password_hash` VARCHAR(100) NOT NULL,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` BIGINT NULL,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `habits` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `type` VARCHAR(10) NOT NULL DEFAULT 'build',
  `unit` VARCHAR(20) NULL,
  `target` INT NULL,
  `color` VARCHAR(16) NULL,
  `icon` VARCHAR(24) NULL,
  `days` VARCHAR(13) NULL,
  `goal` INT NULL,
  `points` INT NOT NULL DEFAULT 1,
  `sort` INT NOT NULL DEFAULT 0,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `habits_user_id_index` (`user_id`),
  CONSTRAINT `habits_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `entries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `habit_id` INT UNSIGNED NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `value` INT NOT NULL,
  `meta` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entries_habit_id_date_unique` (`habit_id`, `date`),
  KEY `entries_user_id_date_index` (`user_id`, `date`),
  CONSTRAINT `entries_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `entries_habit_id_foreign` FOREIGN KEY (`habit_id`) REFERENCES `habits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `days` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `mood` INT NULL,
  `note` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `days_user_id_date_unique` (`user_id`, `date`),
  CONSTRAINT `days_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NULL,
  `color` VARCHAR(16) NULL,
  PRIMARY KEY (`id`),
  KEY `notes_user_id_id_index` (`user_id`, `id`),
  CONSTRAINT `notes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `points` INT NOT NULL DEFAULT 1,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_user_id_date_index` (`user_id`, `date`),
  CONSTRAINT `tasks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
