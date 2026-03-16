import mysql from "mysql2/promise";

export async function seedDemoUsers() {
  if (!process.env.DATABASE_URL) return;

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  await connection.execute(`
    INSERT IGNORE INTO users (name,email,login_method,role,usertype)
    VALUES
    ('Parent','parent@test.com','dev-login','parent','parent'),
    ('Driver','driver@test.com','dev-login','driver','driver'),
    ('Admin','admin@test.com','dev-login','admin','admin')
  `);

  console.log("Demo users seeded");

  await connection.end();
}
