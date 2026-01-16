const crypto = require('crypto');

/**
 * Generate random temporary password
 */
const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Generate reset token
 */

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Parse pagination params
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Build pagination response
 */
const buildPaginationResponse = (totalDocs, page, limit) => {
  const totalPages = Math.ceil(totalDocs / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalDocs,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Build search filter for text search
 */
const buildSearchFilter = (searchTerm, fields) => {
  if (!searchTerm) return {};
  
  const regex = new RegExp(searchTerm, 'i');
  
  if (fields.length === 1) {
    return { [fields[0]]: regex };
  }
  
  return {
    $or: fields.map(field => ({ [field]: regex }))
  };
};

/**
 * Build date range filter
 */
const buildDateFilter = (fromDate, toDate, fieldName = 'date') => {
  const filter = {};
  
  if (fromDate) {
    filter[fieldName] = { $gte: new Date(fromDate) };
  }
  
  if (toDate) {
    filter[fieldName] = { 
      ...filter[fieldName], 
      $lte: new Date(toDate + 'T23:59:59.999Z') 
    };
  }
  
  return filter;
};

/**
 * Generate unique voucher/invoice number
 */
const generateVoucherNo = async (Model, prefix, companyId, branchId) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  
  const lastDoc = await Model.findOne({
    companyId,
    branchId
  }).sort({ createdAt: -1 });
  
  let sequence = 1;
  
  if (lastDoc) {
    const lastNo = lastDoc.invoiceNo || lastDoc.purchaseNo || lastDoc.voucherNo || 
                   lastDoc.expenseNo || lastDoc.receiptNo || lastDoc.paymentNo;
    if (lastNo) {
      const parts = lastNo.split('-');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
  }
  
  return `${prefix}-${year}${month}-${sequence.toString().padStart(5, '0')}`;
};

module.exports = {
  generateTempPassword,
  generateOTP,
  getPagination,
  buildPaginationResponse,
  buildSearchFilter,
  buildDateFilter,
  generateVoucherNo
};
