const {
    IosDeviceName, 
    ScreenOrientation, 
    IosVersion,
    BrowserType, 
    DeviceName
} = require('@applitools/eyes-selenium')

module.exports = {
    
    serverUrl: "https://eyesapi.applitools.com",
    apiKey: process.env.APPLITOOLS_API_KEY,
    remoteUrl: null,
    fullPage: true,
    logs: false,
    sendDom: true, //Enable this for RCA (Root Cause Analysis).
    lazyLoad: true,
    proxy: null, //'http://localhost:8888,yourUser,yourPassword',
    testConcurrency: 7,
    browsersInfo: [
        { width: 1200, height: 800, name: 'firefox' },
        { width: 1200, height: 800, name: 'chrome'  },
        { width: 1200, height: 800, name: 'safari'  },
        { width: 1200, height: 800, name: 'edgechromium' },
        { deviceName: 'Nexus 7',  screenOrientation: 'landscape' },
        { deviceName: 'Pixel 2',  screenOrientation: 'portrait' },
        {iosDeviceInfo: {deviceName: IosDeviceName.iPhone_11} },
     ],
    
    // This is experimental...
    // An Array of raw Selenium steps to take after the page loads... clicks, sendKeys, scroll etc...
    //  afterPageLoad: [
    //      "driver.findElement(By.css('span.cta-link.primary.link-text-yes')).click()",
    //      "driver.findElement(By.css('div.cc-compliance')).click()"
    //  ],
};