const ChartOfAccount = require('../models/ChartOfAccount');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { getPagination, buildPaginationResponse } = require('../utils/helpers');

/**
 * CREATE GROUP / SUBGROUP
 */

const hello = (req, res) => {
	return res.send("hello")
}
module.exports = { hello }


exports.createGroup = async (req, res) => {
  try {
    const {
      name,
      parentGroup,
      item,
      nature,
      isSystemDefined,
      isActive
    } = req.body;

    // Determine groupType based on parentGroup
    let groupType = 'PRIMARY';
    if (parentGroup) {
      const parent = await ChartOfAccount.findById(parentGroup);
      if (!parent) {
        return errorResponse(res, 'Parent group not found', 404);
      }
      groupType = parent.groupType === 'PRIMARY' ? 'GROUP' : 'SUBGROUP';
    }

    const group = await ChartOfAccount.create({
      companyId: req.user.companyId,
      name,
      parentGroup: parentGroup || null,
      groupType,
      item,
      nature,
      isSystemDefined: isSystemDefined || false,
      isActive: isActive !== undefined ? isActive : true
    });

    successResponse(res, { group }, 'Group created', 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

/**
 * GET ALL GROUPS (TREE STRUCTURE)
 */
exports.getAllGroups = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {
      companyId: req.user.companyId,
      isActive: true
    };

    // Optional filters
    if (req.query.item) {
      filter.item = req.query.item;
    }
    if (req.query.nature) {
      filter.nature = req.query.nature;
    }
    if (req.query.groupType) {
      filter.groupType = req.query.groupType;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // If tree format requested
    if (req.query.format === 'tree') {
      const groups = await ChartOfAccount.find({
        companyId: req.user.companyId,
        isActive: true
      }).lean();

      // Build tree structure
      const map = {};
      groups.forEach(g => (map[g._id.toString()] = { ...g, children: [] }));

      const tree = [];
      groups.forEach(g => {
        if (g.parentGroup) {
          const parentKey = g.parentGroup.toString();
          if (map[parentKey]) {
            map[parentKey].children.push(map[g._id.toString()]);
          }
        } else {
          tree.push(map[g._id.toString()]);
        }
      });

      return successResponse(res, { groups: tree });
    }

    // Flat list with pagination
    const [groups, total] = await Promise.all([
      ChartOfAccount.find(filter)
        .populate('parentGroup', 'name groupType')
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 }),
      ChartOfAccount.countDocuments(filter)
    ]);

    paginatedResponse(res, groups, buildPaginationResponse(total, page, limit));
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

/**
 * GET SINGLE GROUP
 */
exports.getGroup = async (req, res) => {
  try {
    const group = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    }).populate('parentGroup', 'name groupType');

    if (!group) {
      return errorResponse(res, 'Group not found', 404);
    }

    successResponse(res, { group });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

/**
 * UPDATE GROUP
 */
exports.updateGroup = async (req, res) => {
  try {
    const {
      name,
      parentGroup,
      item,
      nature,
      isActive
    } = req.body;

    const existingGroup = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!existingGroup) {
      return errorResponse(res, 'Group not found', 404);
    }

    // Prevent modifying system-defined groups (except isActive)
    if (existingGroup.isSystemDefined) {
      const group = await ChartOfAccount.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
      );
      return successResponse(res, { group }, 'System group status updated');
    }

    // Determine new groupType if parentGroup changed
    let groupType = existingGroup.groupType;
    if (parentGroup !== undefined && parentGroup !== existingGroup.parentGroup?.toString()) {
      if (parentGroup) {
        const parent = await ChartOfAccount.findById(parentGroup);
        groupType = parent?.groupType === 'PRIMARY' ? 'GROUP' : 'SUBGROUP';
      } else {
        groupType = 'PRIMARY';
      }
    }

    const group = await ChartOfAccount.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      {
        name,
        parentGroup: parentGroup || null,
        groupType,
        item,
        nature,
        isActive
      },
      { new: true, runValidators: true }
    );

    successResponse(res, { group }, 'Group updated');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE GROUP
 */
exports.deleteGroup = async (req, res) => {
  try {
    const group = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!group) {
      return errorResponse(res, 'Group not found', 404);
    }

    if (group.isSystemDefined) {
      return errorResponse(res, 'System-defined group cannot be deleted', 403);
    }

    // Check for child groups
    const hasChildren = await ChartOfAccount.exists({
      parentGroup: group._id
    });

    if (hasChildren) {
      return errorResponse(res, 'Cannot delete group with subgroups. Delete subgroups first.', 400);
    }

    // Check if any account groups are using this chart of account
    const AccountGroup = require('../models/AccountGroup');
    const hasAccountGroups = await AccountGroup.exists({
      chartOfAccountId: group._id
    });

    if (hasAccountGroups) {
      return errorResponse(res, 'Cannot delete. Account groups are linked to this chart of account.', 400);
    }

    await group.deleteOne();
    successResponse(res, null, 'Group deleted');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};
