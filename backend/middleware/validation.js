const Joi = require('joi');

// Reusable username rule
const usernameRule = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .lowercase()
  .optional()
  .allow(null, '');

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
    password: Joi.string().min(8).max(128).required(),
    username: usernameRule
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createApplication: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    version: Joi.string().trim().max(20).default('1.0')
  }),

  updateApplication: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    version: Joi.string().trim().max(20),
    status: Joi.string().valid('active', 'paused'),
    downloadUrl: Joi.string().allow('', null).optional(),
    discordWebhook: Joi.string().allow('', null).optional(),
    customMessages: Joi.object({
      appDisabled: Joi.string().allow('').optional(),
      appPaused: Joi.string().allow('').optional(),
      invalidLicense: Joi.string().allow('').optional(),
      licenseUsed: Joi.string().allow('').optional(),
      invalidUsername: Joi.string().allow('').optional(),
      usernameTaken: Joi.string().allow('').optional(),
      hwidMismatch: Joi.string().allow('').optional(),
      userBanned: Joi.string().allow('').optional(),
      invalidCreds: Joi.string().allow('').optional(),
      invalidPassword: Joi.string().allow('').optional(),
      noSubscription: Joi.string().allow('').optional(),
      accountPaused: Joi.string().allow('').optional(),
      versionMismatch: Joi.string().allow('').optional()
    }).optional()
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
  }),

  updateUsername: Joi.object({
    username: usernameRule.required()
  })
};

module.exports = { validate, schemas };
