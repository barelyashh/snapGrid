const express = require('express');
const router = express.Router();
require('dotenv').config();


// Article routes
router.get('/articles', async (req, res) => {
    try {
        const response = await fetch(`${process.env.VITE_API_URL}/api/configurator/article`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_BEARER_TOKEN}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Part routes
router.get('/parts', async (req, res) => {
    try {
        const response = await fetch(`${process.env.VITE_API_URL}/api/masterData/partTemplate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_BEARER_TOKEN}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Profile routes
router.get('/profiles', async (req, res) => {
    try {
        const response = await fetch(`${process.env.VITE_API_URL}/api/masterData/profileTemplate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_BEARER_TOKEN}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;