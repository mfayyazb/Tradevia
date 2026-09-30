CREATE TABLE `bookmarks` (
	`owner` text NOT NULL,
	`model` text NOT NULL,
	PRIMARY KEY(`owner`, `model`)
);
--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`asset` text NOT NULL,
	`bars` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `datasets_owner` ON `datasets` (`owner`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`creator` text DEFAULT 'Research member' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `experiments_owner_created` ON `experiments` (`owner`,`created`);