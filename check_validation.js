const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  challenge: Joi.object({
    nonce: Joi.number().required(),
    salt: Joi.string().required(),
    difficulty: Joi.number().required(),
    expiresAt: Joi.number().required(),
    signature: Joi.string().required()
  }).required()
});

const payload = {
  email: "21f1sr0c4z@yzcalo.com",
  password: "mypassword123",
  challenge: {
    nonce: 3580,
    salt: "abcdef1234567890",
    difficulty: 5000,
    expiresAt: Date.now(),
    signature: "signature123"
  }
};

const { error, value } = loginSchema.validate(payload);
if (error) {
  console.log("Validation failed:", error.details.map(d => d.message));
} else {
  console.log("Validation passed successfully!", value);
}
