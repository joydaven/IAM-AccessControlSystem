const Joi = require('joi');

// Validation schemas
const schemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  user: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).optional()
  }),

  userUpdate: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional()
  }),

  group: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  role: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  module: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  permission: Joi.object({
    action: Joi.string().valid('create', 'read', 'update', 'delete').required(),
    module_id: Joi.number().integer().positive().required()
  }),

  assignUsers: Joi.object({
    userIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  }),

  assignRoles: Joi.object({
    roleIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  }),

  assignPermissions: Joi.object({
    permissionIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  }),

  simulateAction: Joi.object({
    userId: Joi.number().integer().positive().required(),
    module: Joi.string().required(),
    action: Joi.string().valid('create', 'read', 'update', 'delete').required()
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    next();
  };
};

// Validate ID parameter
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  req.params.id = id;
  next();
};

module.exports = {
  validate,
  validateId,
  schemas
}; 