CREATE TABLE `config` (
	`id` text PRIMARY KEY NOT NULL,
	`colorModeState` text,
	`isAiEnabled` integer,
	`apiKey` text,
	`isShowLabelOnNavigation` integer,
	`isEnableTitheCard` integer,
	`isEnableTotalHistoryCard` integer,
	`willAddFuelToTransactionList` integer,
	`willUsePrefixToRemoveTihteSum` integer,
	`simpleFinancesItem` integer,
	`marketSimplifiedItems` integer,
	`prefixTithe` text,
	`veicleName` text,
	`veicleBrand` text,
	`veicleYear` text,
	`veicleColor` text,
	`veiclePlate` text,
	`veicleAutonomy` real,
	`selectedFolderToSave` text
);
--> statement-breakpoint
CREATE TABLE `finances` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	`date` integer NOT NULL,
	`paymentDate` integer,
	`paymentStatus` integer NOT NULL,
	`isEnabled` integer NOT NULL,
	`isFavorited` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`currentAmount` real NOT NULL,
	`date` integer NOT NULL,
	`icon` text DEFAULT 'target',
	`category` text DEFAULT 'outros'
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`quantity` integer NOT NULL,
	`quantityDesired` integer NOT NULL,
	`location` text,
	`date` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`location` text,
	`quantity` integer NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`currentDistance` real NOT NULL,
	`unityAmount` real NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`location` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`quantity` integer NOT NULL,
	`quantityDesired` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tithe_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	`month` integer,
	`year` integer,
	`createdAt` integer
);
