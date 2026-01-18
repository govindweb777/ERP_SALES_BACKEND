require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');
const { initSocket } = require('./utils/socket');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
// const chartOfAccountRoutes = require('./routes/chartOfAccounts');
// const accountGroupRoutes = require('./routes/accountGroups');
// const bankAccountRoutes = require('./routes/bankAccounts');
// const itemRoutes = require('./routes/items');
// const salesRoutes = require('./routes/sales');
// const purchaseRoutes = require('./routes/purchases');
// const expenseRoutes = require('./routes/expenses');
// const receiptRoutes = require('./routes/receipts');
// const paymentRoutes = require('./routes/payments');
// const contraEntryRoutes = require('./routes/contraEntries');
// const journalVoucherRoutes = require('./routes/journalVouchers');
// const reportRoutes = require('./routes/reports');


// const itemGroupRoutes = require('./routes/itemGroups');
// const itemCategoryRoutes = require('./routes/itemCategories');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
// initSocket(server);

// Connect to MongoDB
connectDB();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:5173',
      'https://erp-admin-frontend.vercel.app',
      'https://webseeder-erp-ashen.vercel.app',
      'https://erp-sales-backend.onrender.com',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); 
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'prod') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/chart-of-accounts', chartOfAccountRoutes);
// app.use('/api/account-groups', accountGroupRoutes);
// app.use('/api/bank-accounts', bankAccountRoutes);
// app.use('/api/items', itemRoutes);
// app.use('/api/sales', salesRoutes);
// app.use('/api/purchases', purchaseRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/receipts', receiptRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/contra-entries', contraEntryRoutes);
// app.use('/api/journal-vouchers', journalVoucherRoutes);
// app.use('/api/reports', reportRoutes);


// app.use('/api/item-groups', itemGroupRoutes);
// app.use('/api/item-categories', itemCategoryRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'prod' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`ERP Server running on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.emit('test-event', {
    message: 'Socket is working 🚀'
  });
});
