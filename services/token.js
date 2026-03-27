const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

class TokenService {
    /**
     * Generate access token (2 hours)
     * @param {object} cafe - Cafe object with id, name, plan, subscriptionEndDate
     * @returns {string} JWT access token
     */
    generateAccessToken(cafe) {
        if (!process.env.JWT_SECRET) {
            throw new AppError('JWT_SECRET is not configured', 500);
        }

        return jwt.sign(
            {
                id: cafe.id,
                name: cafe.name,
                subscriptionEnd: cafe.subscriptionEndDate,
                role:'cafe'
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
    }

    /**
     * Generate refresh token (7 days)
     * @param {object} cafe - Cafe object with id
     * @returns {string} JWT refresh token
     */
    generateRefreshToken(cafe) {
        if (!process.env.REFRESH_SECRET) {
            throw new AppError('REFRESH_SECRET is not configured', 500);
        }

        return jwt.sign(
            { id: cafe.id, subscriptionEnd: cafe.subscriptionEndDate,name:cafe.name },
            process.env.REFRESH_SECRET,
            { expiresIn: '7d' }
        );
    }
}

module.exports = TokenService;