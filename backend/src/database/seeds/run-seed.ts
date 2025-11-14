import 'reflect-metadata';
import dataSource from '../data-source';
import { seedUsers } from './user.seed';
import { seedCreators } from './creator.seed';
import { seedOpinionMarkets } from './opinion-market.seed';

async function runSeeds() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Initialize data source
    await dataSource.initialize();
    console.log('✅ Data source initialized\n');

    // Run seeds in order
    const users = await seedUsers(dataSource);
    const creators = await seedCreators(dataSource, users);
    await seedOpinionMarkets(dataSource, creators);

    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ Data source destroyed');
  }
}

runSeeds()
  .then(() => {
    console.log('✅ Seeding process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  });
