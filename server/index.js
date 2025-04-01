const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = 3030;

app.use(cors());

app.use(express.json());

app.get('/api', async (req, res) => {
    try {
        console.log('Requesting data...');

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

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
