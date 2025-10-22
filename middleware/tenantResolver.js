const Cafe = require('../models/cafe');

const tenantResolver = async (req, res, next) => {
    try {
        // Host can contain port (example: localhost:5000)
        const hostHeader = req.get('host') || '';
        const host = hostHeader.split(':')[0];

        // If running on localhost or not using subdomains, skip resolution
        if (!host || host === 'localhost' || host === '127.0.0.1') return next();

        // If main domain or www, just continue
        if (host === 'caffin.com' || host === 'www.caffin.com') return next();

        // Extract subdomain (handles sub.subdomain.domain.tld too)
        const parts = host.split('.');
        if (parts.length < 3) return next(); // not a subdomain like moulin.caffin.com
        const subdomain = parts[0];

        // Find the cafe by subdomain
        const cafe = await Cafe.findOne({ where: { subdomain, active: true } });

        if (!cafe) {
            return res.status(404).json({ error: 'Cafe not found' });
        }

        // Attach cafe to request object for downstream handlers
        req.tenant = cafe;
        next();
    } catch (error) {
        console.error('Tenant resolution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = tenantResolver;