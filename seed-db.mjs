import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Parse MySQL connection string
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false,
  },
};

async function seedDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log("Connected to database");

    // Clear existing test data
    try {
      await connection.execute("DELETE FROM tripStudents");
      await connection.execute("DELETE FROM trips");
      await connection.execute("DELETE FROM gpsLocations");
      await connection.execute("DELETE FROM notifications");
      await connection.execute("DELETE FROM students");
      await connection.execute("DELETE FROM stops");
      await connection.execute("DELETE FROM routes");
      await connection.execute("DELETE FROM buses");
      await connection.execute("DELETE FROM users WHERE openId LIKE 'test-%'");
      console.log("Cleared existing test data");
    } catch (e) {
      console.log("Note: Could not clear existing data (may not exist yet)");
    }

    // Create parent user
    const parentResult = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role, userType, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
      ["test-parent-1", "John Parent", "parent@example.com", "test", "user", "parent"]
    );
    const parentId = parentResult[0].insertId;
    console.log("Created parent user:", parentId);

    // Create driver user
    const driverResult = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role, userType, schoolId, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
      ["test-driver-1", "Mike Driver", "driver@example.com", "test", "user", "driver", 1]
    );
    const driverId = driverResult[0].insertId;
    console.log("Created driver user:", driverId);

    // Create admin user
    const adminResult = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role, userType, schoolId, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
      ["test-admin-1", "Sarah Admin", "admin@example.com", "test", "admin", "admin", 1]
    );
    const adminId = adminResult[0].insertId;
    console.log("Created admin user:", adminId);

    // Create buses
    const bus1Result = await connection.execute(
      "INSERT INTO buses (busNumber, driverId, capacity, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      ["BUS-001", driverId, 50, "idle"]
    );
    const bus1Id = bus1Result[0].insertId;
    console.log("Created bus 1:", bus1Id);

    const bus2Result = await connection.execute(
      "INSERT INTO buses (busNumber, driverId, capacity, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      ["BUS-002", driverId, 45, "idle"]
    );
    const bus2Id = bus2Result[0].insertId;
    console.log("Created bus 2:", bus2Id);

    // Create routes
    const route1Result = await connection.execute(
      "INSERT INTO routes (routeName, busId, schoolId, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
      ["Morning Route A", bus1Id, 1]
    );
    const route1Id = route1Result[0].insertId;
    console.log("Created route 1:", route1Id);

    const route2Result = await connection.execute(
      "INSERT INTO routes (routeName, busId, schoolId, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
      ["Afternoon Route B", bus2Id, 1]
    );
    const route2Id = route2Result[0].insertId;
    console.log("Created route 2:", route2Id);

    // Create stops for route 1
    const stop1Result = await connection.execute(
      "INSERT INTO stops (routeId, stopName, latitude, longitude, stopOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [route1Id, "Main Street Stop", "40.7128", "-74.0060", 1]
    );
    const stop1Id = stop1Result[0].insertId;
    console.log("Created stop 1:", stop1Id);

    const stop2Result = await connection.execute(
      "INSERT INTO stops (routeId, stopName, latitude, longitude, stopOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [route1Id, "Oak Avenue Stop", "40.7150", "-74.0080", 2]
    );
    const stop2Id = stop2Result[0].insertId;
    console.log("Created stop 2:", stop2Id);

    const stop3Result = await connection.execute(
      "INSERT INTO stops (routeId, stopName, latitude, longitude, stopOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [route1Id, "Central School", "40.7170", "-74.0100", 3]
    );
    const stop3Id = stop3Result[0].insertId;
    console.log("Created stop 3 (school):", stop3Id);

    // Create students
    const student1Result = await connection.execute(
      "INSERT INTO students (parentId, name, schoolId, homeStopId, schoolStopId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [parentId, "Emma Smith", 1, stop1Id, stop3Id]
    );
    const student1Id = student1Result[0].insertId;
    console.log("Created student 1:", student1Id);

    const student2Result = await connection.execute(
      "INSERT INTO students (parentId, name, schoolId, homeStopId, schoolStopId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [parentId, "Lucas Smith", 1, stop2Id, stop3Id]
    );
    const student2Id = student2Result[0].insertId;
    console.log("Created student 2:", student2Id);

    // Create a trip
    const tripResult = await connection.execute(
      "INSERT INTO trips (busId, routeId, driverId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [bus1Id, route1Id, driverId, "not_started"]
    );
    const tripId = tripResult[0].insertId;
    console.log("Created trip:", tripId);

    // Add students to trip
    await connection.execute(
      "INSERT INTO tripStudents (tripId, studentId, pickedUp, droppedOff, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [tripId, student1Id, false, false]
    );
    console.log("Added student 1 to trip");

    await connection.execute(
      "INSERT INTO tripStudents (tripId, studentId, pickedUp, droppedOff, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [tripId, student2Id, false, false]
    );
    console.log("Added student 2 to trip");

    // Create GPS locations
    await connection.execute(
      "INSERT INTO gpsLocations (busId, latitude, longitude, accuracy, speed, heading, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [bus1Id, "40.7128", "-74.0060", 10, "25.5", "90.0"]
    );
    console.log("Created GPS location for bus 1");

    // Create notifications
    await connection.execute(
      "INSERT INTO notifications (userId, type, title, message, relatedBusId, `read`, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [parentId, "bus_approaching", "Bus Approaching", "School bus is approaching your stop", bus1Id, false]
    );
    console.log("Created notification for parent");

    console.log("\n✅ Database seeded successfully!");
    console.log("\nTest Credentials:");
    console.log("- Parent: parent@example.com");
    console.log("- Driver: driver@example.com");
    console.log("- Admin: admin@example.com");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
