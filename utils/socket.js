let io = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join company room for scoped notifications
    socket.on('join-company', (companyId) => {
      socket.join(`company:${companyId}`);
      console.log(`Socket ${socket.id} joined company:${companyId}`);
    });

    // Join branch room for scoped notifications
    socket.on('join-branch', (branchId) => {
      socket.join(`branch:${branchId}`);
      console.log(`Socket ${socket.id} joined branch:${branchId}`);
    });

    // Join user-specific room
    socket.on('join-user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit to specific company
const emitToCompany = (companyId, event, data) => {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
};

// Emit to specific branch
const emitToBranch = (branchId, event, data) => {
  if (io) {
    io.to(`branch:${branchId}`).emit(event, data);
  }
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit to all admins of a company
const emitToAdmins = (companyId, event, data) => {
  if (io) {
    io.to(`company:${companyId}:admins`).emit(event, data);
  }
};

// Notification types
const NotificationTypes = {
  // Sales
  SALE_CREATED: 'sale:created',
  SALE_UPDATED: 'sale:updated',
  SALE_DELETED: 'sale:deleted',
  
  // Purchases
  PURCHASE_CREATED: 'purchase:created',
  PURCHASE_UPDATED: 'purchase:updated',
  PURCHASE_DELETED: 'purchase:deleted',
  
  // Expenses
  EXPENSE_CREATED: 'expense:created',
  EXPENSE_UPDATED: 'expense:updated',
  
  // Receipts & Payments
  RECEIPT_CREATED: 'receipt:created',
  PAYMENT_CREATED: 'payment:created',
  
  // Users & Branches
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  BRANCH_CREATED: 'branch:created',
  
  // Items
  ITEM_CREATED: 'item:created',
  ITEM_LOW_STOCK: 'item:low_stock',
  
  // General
  NOTIFICATION: 'notification'
};

// Send notification helper
const sendNotification = (companyId, branchId, type, payload) => {
  const notification = {
    type,
    payload,
    timestamp: new Date().toISOString()
  };
  
  // Emit to company level
  emitToCompany(companyId, type, notification);
  
  // Emit to specific branch if provided
  if (branchId) {
    emitToBranch(branchId, type, notification);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToCompany,
  emitToBranch,
  emitToUser,
  emitToAdmins,
  sendNotification,
  NotificationTypes
};
