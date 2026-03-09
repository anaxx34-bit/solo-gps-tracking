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

const DEMO_USERS = [
  {
    openId: "dev-parent-demo",
    name: "Parent Demo",
    email: "parent@test.com",
    loginMethod: "dev-login",
    role: "user",
    userType: "parent",
  },
  {
    openId: "dev-driver-demo",
    name: "Driver Demo",
    email: "driver@test.com",
    loginMethod: "dev-login",
    role: "user",
    userType: "driver",
    schoolId: 1,
  },
  {
    openId: "dev-admin-demo",
    name: "Admin Demo",
    email: "admin@test.com",
    loginMethod: "dev-login",
    role: "admin",
    userType: "admin",
    schoolId: 1,
  },
];

async function seedDemoUsers() {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log("Connected to database");

    for (const user of DEMO_USERS) {
      console.log(`Seeding user: ${user.email} (${user.userType})`);
      
      // Using ON DUPLICATE KEY UPDATE to ensure we don't create duplicates if run multiple times
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, email, loginMethod, role, userType, schoolId, createdAt, updatedAt, lastSignedIn) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), 
         email = VALUES(email), 
         loginMethod = VALUES(loginMethod), 
         role = VALUES(role), 
         userType = VALUES(userType), 
         schoolId = VALUES(schoolId), 
         updatedAt = NOW()`,
        [
          user.openId,
          user.name,
          user.email,
          user.loginMethod,
          user.role,
          user.userType,
          user.schoolId || null,
        ]
      );
      
      console.log(`Successfully seeded/updated user: ${user.email}`);
    }

    console.log("\n✅ Demo users seeded successfully!");
    console.log("\nCredentials for Dev Login:");
    console.log("- Parent: parent@test.com / parent123");
    console.log("- Driver: driver@test.com / driver123");
    console.log("- Admin: admin@test.com / admin123");
    
  } catch (error) {
    console.error("Error seeding demo users:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDemoUsers();
