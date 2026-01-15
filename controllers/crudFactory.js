// Generic CRUD controller factory for ERP modules
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse, buildSearchFilter, buildDateFilter } = require('../utils/helpers');
const { sendNotification } = require('../utils/socket');

const createCRUDController = (Model, searchFields = ['name'], notificationConfig = null) => ({
  getAll: async (req, res) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const filter = {
        companyId: req.user.companyId._id || req.user.companyId,
        ...(req.branchFilter || {}),
        ...buildSearchFilter(req.query.search, searchFields),
        ...buildDateFilter(req.query.from, req.query.to)
      };
      const [docs, total] = await Promise.all([
        Model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('branchId', 'name').populate('createdBy', 'name'),
        Model.countDocuments(filter)
      ]);
      paginatedResponse(res, docs, buildPaginationResponse(total, page, limit));
    } catch (error) { errorResponse(res, error.message, 500); }
  },

  getOne: async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id).populate('branchId createdBy companyId');
      if (!doc) return errorResponse(res, 'Not found', 404);
      successResponse(res, doc);
    } catch (error) { errorResponse(res, error.message, 500); }
  },

  create: async (req, res) => {
    try {
      const companyId = req.user.companyId._id || req.user.companyId;
      const branchId = req.body.branchId || req.user.branchId?._id || req.user.branchId;
      
      const doc = await Model.create({
        ...req.body,
        companyId,
        branchId,
        createdBy: req.user._id
      });
      
      // Emit socket notification if configured
      if (notificationConfig?.onCreate) {
        sendNotification(companyId, branchId, notificationConfig.onCreate, {
          message: `New ${notificationConfig.entityName || 'record'} created`,
          data: doc,
          createdBy: req.user.name
        });
      }
      
      successResponse(res, doc, 'Created successfully', 201);
    } catch (error) { errorResponse(res, error.message, 500); }
  },

  update: async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return errorResponse(res, 'Not found', 404);
      
      // Emit socket notification if configured
      if (notificationConfig?.onUpdate) {
        const companyId = doc.companyId?._id || doc.companyId;
        const branchId = doc.branchId?._id || doc.branchId;
        sendNotification(companyId, branchId, notificationConfig.onUpdate, {
          message: `${notificationConfig.entityName || 'Record'} updated`,
          data: doc,
          updatedBy: req.user.name
        });
      }
      
      successResponse(res, doc);
    } catch (error) { errorResponse(res, error.message, 500); }
  },

  delete: async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      
      // Emit socket notification if configured
      if (doc && notificationConfig?.onDelete) {
        const companyId = doc.companyId?._id || doc.companyId;
        const branchId = doc.branchId?._id || doc.branchId;
        sendNotification(companyId, branchId, notificationConfig.onDelete, {
          message: `${notificationConfig.entityName || 'Record'} deleted`,
          deletedId: req.params.id,
          deletedBy: req.user.name
        });
      }
      
      successResponse(res, null, 'Deleted');
    } catch (error) { errorResponse(res, error.message, 500); }
  }
});

module.exports = { createCRUDController };
