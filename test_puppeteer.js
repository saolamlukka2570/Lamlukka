const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request =>
        console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
    );

    // Let's use a local server to serve the directory.
    // First we start a simple express server.
    const express = require('express');
    const app = express();
    app.use(express.static(__dirname)); // serve current directory
    const server = app.listen(3000, async () => {
        console.log('Server started on port 3000');
        try {
            await page.goto('http://localhost:3000/public-map.html', { waitUntil: 'networkidle0' });
            console.log('Page loaded successfully');
        } catch (err) {
            console.error('Navigation error:', err);
        }
        await browser.close();
        server.close();
    });
})();
