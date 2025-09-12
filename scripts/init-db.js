const postgres = require('postgres');

async function initDatabase() {
  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

  try {
    console.log('Initializing database...');

    // Create tables
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    // Create customers table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `;

    // Create invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `;

    // Create revenue table
    await sql`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `;

    console.log('Database tables created successfully');

    // Check if data exists
    const userCount = await sql`SELECT COUNT(*) FROM users`;
    if (userCount[0].count === '0') {
      console.log('No data found, please run the seed endpoint manually');
    }

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
