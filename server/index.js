const express = require('express');
const cors = require('cors');
const router = require('./routes');

const app = express();
const PORT = 3030;

app.use(cors());

app.use(express.json());

app.use('/api', router)

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
