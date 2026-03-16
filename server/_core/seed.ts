import mysql from "mysql2/promise";

export async function seedDemoUsers() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set, skipping seed");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(50)
    )
  `);

  await connection.execute(`
    INSERT IGNORE INTO users (name,email,password,role) VALUES
    ('Parent','parent@test.com','parent123','parent'),
    ('Driver','driver@test.com','driver123','driver'),
    ('Admin','admin@test.com','admin123','admin')
  `);

  console.log("Demo users seeded");

  await connection.end();
}
