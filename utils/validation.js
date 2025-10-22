const { AppError } = require('./errors');

const validateOrder = (tableId, items) => {
    if (!tableId) {
        throw new AppError('Table ID is required', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Items array is required and cannot be empty', 400);
    }

    items.forEach((item, index) => {
        if (!item.itemId || !item.quantity) {
            throw new AppError(`Invalid item at position ${index + 1}. ItemId and quantity are required`, 400);
        }
        
        if (item.quantity <= 0) {
            throw new AppError(`Invalid quantity for item at position ${index + 1}. Quantity must be positive`, 400);
        }
    });
};

module.exports = {
    validateOrder
};