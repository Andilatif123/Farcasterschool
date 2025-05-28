// api/frame.js
// Ini adalah serverless function untuk Farcaster Frame Tebak Angka.
// Dibuat dengan Node.js dan Express (via micro-http-router).

const { createServer } = require('http');
const { parse } = require('url');

// Fungsi untuk membuat HTML respons Farcaster Frame
function getFrameHtml(imageUrl, inputText, buttonText, postUrl, stateJson) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Guess the Number Frame</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}" />` : ''}
        <meta property="fc:frame:button:1" content="${buttonText}" />
        <meta property="fc:frame:post_url" content="${postUrl}" />
        <meta property="fc:frame:state" content='${JSON.stringify(stateJson)}' />
    </head>
    <body>
        <h1>Farcaster Guess the Number Game Backend</h1>
        <p>This is the backend for the Farcaster Frame. Interact on Farcaster!</p>
    </body>
    </html>
    `;
}

// Handler untuk permintaan HTTP
module.exports = async (req, res) => {
    const { method } = req;
    const { pathname } = parse(req.url, true);

    res.setHeader('Content-Type', 'text/html'); // Pastikan responsnya adalah HTML

    if (method === 'POST' && pathname === '/api/frame') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        await new Promise(resolve => req.on('end', resolve));

        let frameData;
        try {
            frameData = JSON.parse(body);
        } catch (e) {
            console.error("Failed to parse request body:", e);
            res.statusCode = 400;
            res.end(getFrameHtml(
                `https://placehold.co/600x400/FF0000/FFFFFF?text=Error!`,
                null,
                "Mulai Ulang",
                `${req.headers.origin}/api/frame`,
                {}
            ));
            return;
        }

        const input = frameData.untrustedData.inputText;
        let state = {};
        try {
            // Mengambil state dari Farcaster Frame (jika ada)
            state = JSON.parse(decodeURIComponent(frameData.untrustedData.state || '{}'));
        } catch (e) {
            console.error("Failed to parse state:", e);
            state = {}; // Reset state jika ada masalah
        }

        let secretNumber = state.secretNumber;
        let attempts = state.attempts || 0;
        let message = '';
        let imageUrl = '';
        let buttonText = 'Tebak!';
        let inputText = 'Masukkan tebakanmu (1-100)';
        let isGameOver = false;

        // Inisialisasi game jika belum ada angka rahasia
        if (!secretNumber) {
            secretNumber = Math.floor(Math.random() * 100) + 1;
            attempts = 0;
            message = "Saya memikirkan angka antara 1 dan 100. Coba tebak!";
            imageUrl = `https://placehold.co/600x400/000/fff?text=${encodeURIComponent(message)}`;
        } else {
            const userGuess = parseInt(input);

            if (isNaN(userGuess) || userGuess < 1 || userGuess > 100) {
                message = "Tolong masukkan angka yang valid antara 1 dan 100.";
                imageUrl = `https://placehold.co/600x400/FFD700/000?text=${encodeURIComponent(message)}`;
            } else {
                attempts++;
                if (userGuess === secretNumber) {
                    message = `Selamat! Kamu menebak angka ${secretNumber} dalam ${attempts} percobaan!`;
                    imageUrl = `https://placehold.co/600x400/00FF00/000?text=${encodeURIComponent(message)}`;
                    buttonText = 'Main Lagi';
                    inputText = null; // Sembunyikan input setelah menang
                    isGameOver = true;
                } else if (userGuess < secretNumber) {
                    message = `Terlalu rendah! Coba lagi. Percobaan: ${attempts}`;
                    imageUrl = `https://placehold.co/600x400/ADD8E6/000?text=${encodeURIComponent(message)}`;
                } else {
                    message = `Terlalu tinggi! Coba lagi. Percobaan: ${attempts}`;
                    imageUrl = `https://placehold.co/600x400/FFB6C1/000?text=${encodeURIComponent(message)}`;
                }
            }
        }

        // Perbarui state untuk respons berikutnya
        if (isGameOver) {
            state = {}; // Reset state jika game selesai
        } else {
            state = { secretNumber: secretNumber, attempts: attempts };
        }

        res.statusCode = 200;
        res.end(getFrameHtml(
            imageUrl,
            inputText,
            buttonText,
            `${req.headers.origin}/api/frame`, // Post URL tetap ke endpoint ini
            state
        ));
    } else if (method === 'GET' && pathname === '/api/frame') {
        // Ini adalah respons untuk permintaan GET awal ke endpoint API.
        // Farcaster akan memanggil POST, tetapi browser mungkin memanggil GET.
        res.statusCode = 200;
        res.end(getFrameHtml(
            `https://placehold.co/600x400/000/fff?text=Tebak+Angka+1-100`,
            "Masukkan tebakanmu (1-100)",
            "Tebak!",
            `${req.headers.origin}/api/frame`,
            {} // State awal kosong
        ));
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
};
