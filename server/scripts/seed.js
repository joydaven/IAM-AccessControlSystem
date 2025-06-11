const { initializeDatabase } = require('../database/setup');

console.log('🌱 Starting database seeding...');

initializeDatabase()
  .then(() => {
    console.log('✅ Database seeding completed successfully!');
    console.log('🚀 You can now start the server with: npm run dev');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }); 