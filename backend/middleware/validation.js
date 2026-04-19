const Joi = require('joi');

// Validate request body against schema
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    req.body = value;
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createApplication: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    version: Joi.string().trim().max(20).default('1.0.0')
  }),

  updateApplication: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    version: Joi.string().trim().max(20),
    status: Joi.string().valid('active', 'paused')
  }).min(1),

  generateLicense: Joi.object({
    applicationId: Joi.string().required(),
    expiryType: Joi.string().valid('days', 'lifetime').required(),
    expiryDays: Joi.number().min(1).max(3650).when('expiryType', {
      is: 'days',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    count: Joi.number().min(1).max(100).default(1)
  }),

  clientInit: Joi.object({
    app_name: Joi.string().required(),
    owner_id: Joi.string().required(),
    timestamp: Joi.number().required(),
    nonce: Joi.string().required(),
    signature: Joi.string().required()
  }),

  clientLogin: Joi.object({
    app_name: Joi.string().required(),
    owner_id: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    hwid: Joi.string().required(),
    timestamp: Joi.number().required(),
    nonce: Joi.string().required(),
    signature: Joi.string().required()
  }),

  clientRegister: Joi.object({
    app_name: Joi.string().required(),
    owner_id: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().min(6).required(),
    license_key: Joi.string().required(),
    hwid: Joi.string().required(),
    timestamp: Joi.number().required(),
    nonce: Joi.string().required(),
    signature: Joi.string().required()
  })
};

module.exports = { validate, schemas };
