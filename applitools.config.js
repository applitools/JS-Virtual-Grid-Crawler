module.exports = {
    
    serverUrl: "https://eyesapi.applitools.com",
    apiKey: process.env.APPLITOOLS_API_KEY,
    fullPage: true,
    logs: true,
    sendDom: true, //Enable this for RCA (Root Cause Analysis).
    lazyLoad: true,
    proxy: null, //'http://localhost:8888,yourUser,yourPassword',
    testConcurrency: 8,
    browsersInfo: [
        { width: 1200, height: 800, name: 'firefox' },
        { width: 1200, height: 800, name: 'chrome'  },
        { width: 1200, height: 800, name: 'safari'  },
        { width: 1200, height: 800, name: 'edgechromium'    },
        { deviceName: 'iPhone X', screenOrientation: 'portrait' },
        { deviceName: 'iPad',     screenOrientation: 'portrait' },
        { deviceName: 'Nexus 7',  screenOrientation: 'landscape' },
        { deviceName: 'Pixel 2',  screenOrientation: 'landscape' }
     ],
    
    // This is experimental...
    // An Array of raw Selenium steps to take after the page loads... clicks, sendKeys, scroll etc...
    //  afterPageLoad: [
    //      "driver.findElement(By.css('span.cta-link.primary.link-text-yes')).click()",
    //      "driver.findElement(By.css('div.cc-compliance')).click()"
    //  ],
};