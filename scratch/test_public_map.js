const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public-map.html', 'utf8');

const dom = new JSDOM(html, {
    url: "http://localhost/public-map.html",
    runScripts: "dangerously",
    resources: "usable"
});

dom.window.console.log = (...args) => console.log('LOG:', ...args);
dom.window.console.warn = (...args) => console.warn('WARN:', ...args);
dom.window.console.error = (...args) => console.error('ERROR:', ...args);

dom.window.addEventListener("error", (event) => {
    console.error("Uncaught error:", event.error);
});
dom.window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled rejection:", event.reason);
});

// Wait a bit to let scripts load and execute
setTimeout(() => {
    console.log("Done waiting");
}, 5000);
