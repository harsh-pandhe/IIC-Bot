// middleware/validator.js
const { body, validationResult } = require('express-validator');

// Validation middleware executor
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Login validation rules
const loginValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    validate
];

// Register validation rules
const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters'),
    validate
];

// Chat validation rules
const chatValidation = [
    body('question')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Question must be 1-2000 characters'),
    body('history')
        .optional()
        .isString(),
    validate
];

// Rating validation rules
const ratingValidation = [
    body('questionId')
        .notEmpty()
        .withMessage('Question ID is required'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Feedback must be less than 500 characters'),
    validate
];

module.exports = {
    loginValidation,
    registerValidation,
    chatValidation,
    ratingValidation
};
