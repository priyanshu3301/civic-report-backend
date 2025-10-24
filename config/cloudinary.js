import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Validate configuration on startup
const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('🚨 Missing Cloudinary configuration:', missing.join(', '));
    console.error('💡 Please add these to your .env file');
    return false;
  }
  
  console.log('✅ Cloudinary configured successfully');
  return true;
};

// Test Cloudinary connection
export const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return false;
  }
};

// Validate on module load
validateCloudinaryConfig();

export default cloudinary;