import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: false,
});

async function setupAdmin() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected!');

    // Check if user exists
    const result = await AppDataSource.query(
      `SELECT id, "twitterHandle", "displayName", "isAdmin", "walletAddress"
       FROM users
       WHERE "twitterHandle" = $1`,
      ['guesslydotfun']
    );

    if (result.length === 0) {
      console.log('❌ User @guesslydotfun not found.');
      console.log('Please log in with this Twitter account first, then run this script again.');
      process.exit(1);
    }

    const user = result[0];
    console.log('✅ Found user:', user);

    // Update user to be admin and set wallet
    await AppDataSource.query(
      `UPDATE users
       SET "isAdmin" = true, "walletAddress" = $1
       WHERE "twitterHandle" = 'guesslydotfun'`,
      ['0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf']
    );

    // Verify update
    const updated = await AppDataSource.query(
      `SELECT id, "twitterHandle", "displayName", "isAdmin", "walletAddress"
       FROM users
       WHERE "twitterHandle" = 'guesslydotfun'`
    );

    console.log('✅ Admin user updated:', updated[0]);
    console.log('\n🎉 Admin setup complete!');
    console.log(`   Twitter: @${updated[0].twitterHandle}`);
    console.log(`   Admin: ${updated[0].isAdmin}`);
    console.log(`   Wallet: ${updated[0].walletAddress}`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

setupAdmin();
