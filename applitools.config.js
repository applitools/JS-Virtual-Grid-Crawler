module.exports = {
    
    serverUrl: "https://eyesapi.applitools.com",
    apiKey: process.env.APPLITOOLS_API_KEY,
    appName: 'JS-Crawler',
    fullPage: true,
    logs: false,
    browsersInfo: [
        { width: 1200, height: 800, name: 'chrome'  },
        { width: 1200, height: 800, name: 'firefox' },
        { width: 1200, height: 800, name: 'ie10'    },
        { width: 1200, height: 800, name: 'ie11'    },
        { width: 1200, height: 800, name: 'edge'    },
        { deviceName: 'iPhone X', screenOrientation: 'portrait' },
        { deviceName: 'iPad',     screenOrientation: 'portrait' },
        { deviceName: 'Nexus 7',  screenOrientation: 'portrait' },
        { deviceName: 'Pixel 2',  screenOrientation: 'portrait' }
     ],

     //An Array of raw Selenium steps to take after the page loads... clicks, sendKeys, scroll etc...
    //  afterPageLoad: [
    //      "driver.findElement(By.css('span.cta-link.primary.link-text-yes')).click()",
    //      "driver.findElement(By.css('div.cc-compliance')).click()"
    //  ],
};