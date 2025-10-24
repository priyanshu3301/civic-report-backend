import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanReports = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const reportsCollection = db.collection('reports');

    console.log('⚠️  WARNING: This will delete ALL reports!');
    console.log('🔄 Deleting all reports...');

    const result = await reportsCollection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} reports`);

    console.log('🔄 Creating geospatial index...');
    await reportsCollection.createIndex({ location: '2dsphere' });
    console.log('✅ Geospatial index created');

    console.log('🔄 Creating other indexes...');
    await reportsCollection.createIndex({ status: 1, category: 1 });
    await reportsCollection.createIndex({ severity: -1, createdAt: -1 });
    console.log('✅ All indexes created successfully');

    // Verify indexes
    const indexes = await reportsCollection.indexes();
    console.log('\n📊 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    console.log('\n✅ Database cleaned and ready for new reports!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanReports();