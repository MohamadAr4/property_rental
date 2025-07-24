import Joi from 'joi';

// Common phone number validation
const phoneValidation = Joi.string()
  .pattern(/^[0-9]{10,15}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be 10-15 digits',
    'any.required': 'Phone number is required'
  });

// Common password validation
const passwordValidation = Joi.string()
  .min(6)
  .max(30)
  .required()
  .messages({
    'string.min': 'Password must be at least 6 characters',
    'string.max': 'Password must not exceed 30 characters',
    'any.required': 'Password is required'
  });

// Common email validation
const emailValidation = Joi.string()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  });

export const registerSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'name must be at least 3 characters',
      'string.max': 'name must not exceed 50 characters',
      'any.required': 'name is required'
    }),

  phone_number: phoneValidation,
  
  email: emailValidation,
  
  password: passwordValidation,
  
  location: Joi.string()
    .max(100)
    .optional(),
    
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),
    
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional(),
    
  role: Joi.string()
    .valid('USER')
    .default('USER')
});

export const loginSchema = Joi.object({
  // Allow login with either phone or email
  phone_number: Joi.alternatives()
    .try(
      phoneValidation,
      emailValidation
    )
    .required()
    .messages({
      'alternatives.match': 'Please provide a valid phone number or email',
      'any.required': 'Phone number or email is required'
    }),
    
  email : emailValidation,
  password: passwordValidation
});

// Validation middleware
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.context.key,
      message: detail.message
    }));
    return res.status(400).json({ errors });
  }
  next();
};