import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        console.log('Puppeteer launched successfully');
        await browser.close();
        process.exit(0);
    } catch (error) {
        console.error('Puppeteer failed:', error);
        process.exit(1);
    }
})();
