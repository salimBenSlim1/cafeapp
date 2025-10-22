class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const handleError = (err, res) => {
    const { statusCode = 500, message } = err;
    const response = {
        status: statusCode >= 500 ? 'error' : 'fail',
        message: statusCode >= 500 ? 'Internal server error' : message,
    };

    // Add error details in development environment
    if (process.env.NODE_ENV === 'development') {
        response.error = err;
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = {
    AppError,
    handleError
};