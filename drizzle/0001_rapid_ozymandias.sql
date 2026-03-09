CREATE TABLE `buses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`busNumber` varchar(50) NOT NULL,
	`driverId` int NOT NULL,
	`capacity` int NOT NULL,
	`status` enum('idle','in_transit','completed') NOT NULL DEFAULT 'idle',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buses_id` PRIMARY KEY(`id`),
	CONSTRAINT `buses_busNumber_unique` UNIQUE(`busNumber`)
);
--> statement-breakpoint
CREATE TABLE `gpsLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`busId` int NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` int,
	`speed` decimal(8,2),
	`heading` decimal(6,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gpsLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('bus_approaching','child_boarded','child_at_school','child_at_home','route_deviation','alert') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text,
	`relatedBusId` int,
	`relatedStudentId` int,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeName` varchar(100) NOT NULL,
	`busId` int NOT NULL,
	`schoolId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int NOT NULL,
	`stopName` varchar(100) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`stopOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`schoolId` int,
	`homeStopId` int,
	`schoolStopId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tripStudents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`studentId` int NOT NULL,
	`pickedUp` boolean NOT NULL DEFAULT false,
	`droppedOff` boolean NOT NULL DEFAULT false,
	`pickupTime` timestamp,
	`dropoffTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tripStudents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`busId` int NOT NULL,
	`routeId` int NOT NULL,
	`driverId` int NOT NULL,
	`startTime` timestamp,
	`endTime` timestamp,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('parent','driver','admin') DEFAULT 'parent';--> statement-breakpoint
ALTER TABLE `users` ADD `schoolId` int;