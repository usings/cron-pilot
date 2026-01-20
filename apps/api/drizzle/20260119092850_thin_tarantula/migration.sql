CREATE TABLE `task_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`description` text,
	`cron` text NOT NULL,
	`icon` text,
	`command` text NOT NULL,
	`envs` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_executions` (
	`id` text PRIMARY KEY,
	`task_id` integer NOT NULL,
	`status` text NOT NULL,
	`exit_code` integer,
	`stdout` text,
	`stderr` text,
	`started_at` integer,
	`finished_at` integer,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_task_executions_task_id_task_definitions_id_fk` FOREIGN KEY (`task_id`) REFERENCES `task_definitions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `task_metrics` (
	`task_id` integer PRIMARY KEY,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`failed_runs` integer DEFAULT 0 NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer,
	CONSTRAINT `fk_task_metrics_task_id_task_definitions_id_fk` FOREIGN KEY (`task_id`) REFERENCES `task_definitions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_task_exec_by_task_and_status` ON `task_executions` (`task_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_task_exec_by_status_created_at` ON `task_executions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_task_exec_by_status_started_at` ON `task_executions` (`status`,`started_at`);