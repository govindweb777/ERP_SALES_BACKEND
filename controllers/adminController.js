const User = require('../models/User');
const Branch = require('../models/Branch');
const Company = require('../models/Company');
const Sales = require('../models/Sales');
const Purchase = require('../models/Purchase');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { sendWelcomeEmail, sendBranchCreatedEmail } = require('../utils/email');
const { generateTempPassword, getPagination, buildPaginationResponse, buildSearchFilter } = require('../utils/helpers');
const { uploadProfile } = require('../config/multer');
const { sendNotification, NotificationTypes } = require('../utils/socket');

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const [totalUsers, totalBranches, totalSales, totalPurchases] = await Promise.all([
      User.countDocuments({ companyId, isActive: true }),
      Branch.countDocuments({ companyId, isDeleted: false }),
      Sales.aggregate([{ $match: { companyId: companyId._id, isActive: true } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Purchase.aggregate([{ $match: { companyId: companyId._id, isActive: true } }, { $group: { _id: null, total: { $sum: '$total' } } }])
    ]);
    successResponse(res, { totalUsers, totalBranches, totalSales: totalSales[0]?.total || 0, totalPurchases: totalPurchases[0]?.total || 0 });
  } catch (error) { errorResponse(res, error.message, 500); }
};

// CRUD Users
exports.getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { 
      companyId: req.user.companyId, 
      ...buildSearchFilter(req.query.search, ['name', 'email']) 
    };
    
    // Filter by isActive if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Filter by role if provided
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    const [users, total] = await Promise.all([
      User.find(filter).populate('branchId', 'branchName branchCode').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);
    paginatedResponse(res, users, buildPaginationResponse(total, page, limit));
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, role, branchId, phoneNumber, moduleAccess, password } = req.body;
    const tempPassword = password || generateTempPassword();
    
    const userData = { 
      name, 
      email, 
      password: tempPassword, 
      role, 
      branchId, 
      phoneNumber,
      companyId: req.user.companyId 
    };
    
    // Add module access for user-panel role
    if (role === 'user-panel' && moduleAccess) {
      userData.moduleAccess = moduleAccess;
    }
    
    const user = await User.create(userData);
    await sendWelcomeEmail(email, name, tempPassword, role);
    
    // Update branch user count if branchId provided
    if (branchId) {
      await Branch.findByIdAndUpdate(branchId, { $inc: { noOfUsers: 1 } });
    }
    
    // Emit socket notification
    sendNotification(req.user.companyId, branchId, NotificationTypes.USER_CREATED, {
      message: `New user "${name}" created`,
      user: { _id: user._id, name, email, role },
      createdBy: req.user.name
    });
    
    successResponse(res, { user }, 'User created', 201);
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Create User Panel (Admin only)
exports.createUserPanel = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, moduleAccess } = req.body;
    
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      role: 'user-panel',
      moduleAccess: moduleAccess || {},
      companyId: req.user.companyId
    });
    
    await sendWelcomeEmail(email, name, password, 'user-panel');
    
    sendNotification(req.user.companyId, null, NotificationTypes.USER_CREATED, {
      message: `New user panel user "${name}" created`,
      user: { _id: user._id, name, email, role: 'user-panel' },
      createdBy: req.user.name
    });
    
    successResponse(res, { user }, 'User panel created', 201);
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return errorResponse(res, 'User not found', 404);
    
    // Emit socket notification
    sendNotification(req.user.companyId, user.branchId, NotificationTypes.USER_UPDATED, {
      message: `User "${user.name}" updated`,
      user: { _id: user._id, name: user.name, email: user.email },
      updatedBy: req.user.name
    });
    
    successResponse(res, { user });
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    
    // Decrease branch user count
    if (user.branchId) {
      await Branch.findByIdAndUpdate(user.branchId, { $inc: { noOfUsers: -1 } });
    }
    
    await User.findByIdAndDelete(req.params.id);
    successResponse(res, null, 'User deleted');
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Toggle User Active Status
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    
    user.isActive = !user.isActive;
    await user.save();
    
    successResponse(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) { errorResponse(res, error.message, 500); }
};

// CRUD Branches (with pagination and soft delete)
exports.getBranches = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { 
      companyId: req.user.companyId,
      isDeleted: false,
      ...buildSearchFilter(req.query.search, ['branchName', 'branchCode'])
    };
    
    // Filter by isActive if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    const [branches, total] = await Promise.all([
      Branch.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Branch.countDocuments(filter)
    ]);
    
    paginatedResponse(res, branches, buildPaginationResponse(total, page, limit));
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!branch) {
      return errorResponse(res, 'Branch not found', 404);
    }

    successResponse(res, { branch });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};


exports.createBranch = async (req, res) => {
  try {
    const { 
      branchName, address, phoneNumber, email, password, branchManagerName,
      openingHours, establishedDate, servicesOffered, location, isHeadOffice 
    } = req.body;
    
    // Generate branch code
    const branchCode = await Branch.generateBranchCode(req.user.companyId);
    
    // Parse services if it's a comma-separated string
    let services = servicesOffered;
    if (typeof servicesOffered === 'string') {
      services = servicesOffered.split(',').map(s => s.trim()).filter(s => s);
    }
    
    const branch = await Branch.create({
      branchName,
      branchCode,
      address,
      phoneNumber,
      email,
      branchManagerName,
      openingHours,
      establishedDate,
      servicesOffered: services,
      location,
      isHeadOffice,
      companyId: req.user.companyId
    });
    
    // If password provided, create branch manager user
    if (password && email) {
      const branchManager = await User.create({
        name: branchManagerName || `${branchName} Manager`,
        email,
        password,
        role: 'branch',
        branchId: branch._id,
        companyId: req.user.companyId
      });
      
      await sendBranchCreatedEmail(email, branchManagerName || branchName, branchName, req.user.email);
      
      // Increment user count
      branch.noOfUsers = 1;
      await branch.save();
    }
    
    // Emit socket notification
    sendNotification(req.user.companyId, branch._id, NotificationTypes.BRANCH_CREATED, {
      message: `New branch "${branchName}" created`,
      branch: { _id: branch._id, branchName, branchCode, address },
      createdBy: req.user.name
    });
    
    successResponse(res, { branch }, 'Branch created', 201);
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.updateBranch = async (req, res) => {
  try {
    // Parse services if it's a comma-separated string
    if (typeof req.body.servicesOffered === 'string') {
      req.body.servicesOffered = req.body.servicesOffered.split(',').map(s => s.trim()).filter(s => s);
    }
    
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    );
    if (!branch) return errorResponse(res, 'Branch not found', 404);
    successResponse(res, { branch });
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Soft delete branch
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!branch) return errorResponse(res, 'Branch not found', 404);
    
    // Deactivate all users in this branch
    await User.updateMany({ branchId: req.params.id }, { isActive: false });
    
    successResponse(res, null, 'Branch deleted');
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Toggle Branch Active Status
exports.toggleBranchStatus = async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, companyId: req.user.companyId, isDeleted: false });
    if (!branch) return errorResponse(res, 'Branch not found', 404);
    
    branch.isActive = !branch.isActive;
    await branch.save();
    
    // Toggle all users in branch
    await User.updateMany({ branchId: req.params.id }, { isActive: branch.isActive });
    
    successResponse(res, { branch }, `Branch ${branch.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Restore deleted branch
exports.restoreBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId, isDeleted: true },
      { isDeleted: false },
      { new: true }
    );
    if (!branch) return errorResponse(res, 'Branch not found or not deleted', 404);
    successResponse(res, { branch }, 'Branch restored');
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Get deleted branches
exports.getDeletedBranches = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { companyId: req.user.companyId, isDeleted: true };
    
    const [branches, total] = await Promise.all([
      Branch.find(filter).skip(skip).limit(limit).sort({ updatedAt: -1 }),
      Branch.countDocuments(filter)
    ]);
    
    paginatedResponse(res, branches, buildPaginationResponse(total, page, limit));
  } catch (error) { errorResponse(res, error.message, 500); }
};

// Upload Profile
exports.uploadProfilePic = [uploadProfile.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const user = await User.findByIdAndUpdate(req.params.id, { profilePic: `/uploads/profile/${req.file.filename}` }, { new: true });
    successResponse(res, { user });
  } catch (error) { errorResponse(res, error.message, 500); }
}];

// Company Management (only one company)
exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);
    successResponse(res, { company });
  } catch (error) { errorResponse(res, error.message, 500); }
};

exports.updateCompany = async (req, res) => {
  try {
    const {
      companyName,
      registrationType,
      businessType,
      gstin,
      establishedFrom,
      address,
      contact,
      logo,
      isActive
    } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      {
        companyName,
        registrationType,
        businessType,
        gstin,
        establishedFrom,
        address,
        contact,
        logo,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!company) return errorResponse(res, 'Company not found', 404);
    successResponse(res, { company });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

