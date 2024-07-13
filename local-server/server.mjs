import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

app.get('/api/data', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL query parameter is required' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
                "X-Client-Version": "33.12.0",
                "X-Link-Identifier": "Oy9keW5hbWljLXBhZ2VzL2h1ZHZhcmQvYmVzdC1zZWxsZXJzLXNraW5jYXJlLXNsaW0vdG9wLXNlbGxlcnM7Iztwcm9kdWN0X2tleTsyMzI4LTEwNy0wMjQwX3N2LXNlOyM7O05PTkU6Tk9ORTszNzs",
                "X-Request-Action": "click",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            },
            method: "GET"
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch data' });
        }

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        res.json( data );
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

