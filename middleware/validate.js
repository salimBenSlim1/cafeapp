const { AppError } = require("../utils/errors");

module.exports = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true
        });
        
        if (error) {
            const errors = error.details.map(err => ({
                field: err.path[0],
                message: err.message
            }));
            
            return res.status(400).json({
                status: 'fail',
                message: 'Validation Error',
                errors
            });
        }
        
        // Attach validated data to request
        req.validatedData = value;
        next();
    };
};