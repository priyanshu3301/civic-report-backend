import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('🚨 Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('🚨 JWT_SECRET is too weak! Must be at least 32 characters.');
  console.error('💡 Generate a secure JWT secret with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();

// --- CORS ---
const corsOptions = {
  origin: ['http://localhost:5173'], // add more if needed
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// --- Body parsing ---
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf.toString(encoding));
      } catch (e) {
        const err = new Error('Invalid JSON payload');
        err.status = 400;
        throw err;
      }
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000,
  })
);

// --- Security headers ---
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://analytics.google.com;"
  );
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// --- Request timeout middleware ---
app.use((req, res, next) => {
  const isUploadEndpoint = req.path.startsWith('/api/reports/upload');
  const timeoutMs = isUploadEndpoint ? 180000 : 30000; // 3 min for uploads, 30s default
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs);
  next();
});

// --- Placeholder for API routes ---


// --- Centralized error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

// --- Start server after DB connection ---
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to connect to database', err);
    process.exit(1);
  }
})();
