
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3030;

app.use(cors());

app.use(express.json());

app.get('/api', async (req, res) => {
    try {
        console.log('Requesting data...');

        const response = await fetch('https://development_dev_enterprise_eos.cadt365.com/api/configurator/article', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer 34DB6D3EEF35530C8B891B30E4E812C2C18B3B94701DB67F941608655D708479',
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
