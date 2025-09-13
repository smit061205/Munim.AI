import express from 'express';

const router = express.Router();

// Default allowed categories
let allowedCategories = {
    assets: true,
    liabilities: true,
    transactions: true,
    epf: true,
    creditScore: true,
    investments: true
};

// GET /api/permissions
router.get('/', (req, res) => {
    res.json({ allowedCategories });
});

// POST /api/permissions
router.post('/', (req, res) => {
    const { categories } = req.body;
    
    if (!categories || typeof categories !== 'object') {
        return res.status(400).json({ error: 'Invalid categories format' });
    }

    // Update only valid categories
    Object.keys(categories).forEach(category => {
        if (allowedCategories.hasOwnProperty(category)) {
            allowedCategories[category] = Boolean(categories[category]);
        }
    });

    res.json({ allowedCategories });
});

export default router;