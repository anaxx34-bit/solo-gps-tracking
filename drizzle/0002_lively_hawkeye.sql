CREATE TABLE `alarmNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`busId` int NOT NULL,
	`alarmSettingId` int,
	`triggerTime` timestamp NOT NULL DEFAULT (now()),
	`dismissedAt` timestamp,
	`openedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alarmNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alarmSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`busId` int,
	`alarmTimeMinutes` int NOT NULL DEFAULT 5,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alarmSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `etaData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`busId` int NOT NULL,
	`tripId` int NOT NULL,
	`nextStopId` int,
	`distanceToNextStop` decimal(10,2),
	`estimatedArrivalTime` timestamp,
	`currentSpeed` decimal(8,2),
	`averageSpeed` decimal(8,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `etaData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofenceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`busId` int NOT NULL,
	`geofenceId` int NOT NULL,
	`eventType` enum('enter','exit') NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geofenceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('school','stop','home','custom') NOT NULL DEFAULT 'custom',
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`radiusMeters` int NOT NULL DEFAULT 500,
	`schoolId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofences_id` PRIMARY KEY(`id`)
);
