"use strict"; 

const urlParser = require('url');
const pry = require('pryjs')
const sitemap = require('sitemap-generator');
const fs = require('fs');
const smta = require('sitemap-to-array');
const path = require('path');
const sleep = require('sleep');
const program = require('commander');
const PromisePool = require('es6-promise-pool');
const {Builder, By, until, Capabilities} = require('selenium-webdriver');
const { 
   Eyes, 
   VisualGridRunner,
   ClassicRunner,
   Target, 
   ConsoleLogHandler,
   ProxySettings, 
   Configuration, 
   BatchInfo,
   StitchMode,
   TestResults,
   MatchLevel} = require('@applitools/eyes-selenium');
const config = require('./applitools.config.js');

async function SitemapGenerator(url, maxUrls) {
   
   let host = urlParser.parse(url).host;
   let filepath = './sitemaps/' + host + '.xml';

   let generator = sitemap(url, {
   	maxDepth: 0,
     	filepath: filepath,
     	stripQuerystring: true,
     	maxEntriesPerFile: maxUrls
   });

   generator.start();

   generator.on('add', (url) => {
      console.log(url);
   });

   generator.on('error', (error) => {
      console.log(error);
   });

   return new Promise((resolve) => {
      generator.on('done', () => {
         console.log("\nSitemap Generation Complete!\n");
         resolve(filepath);
      });
   });
}

async function sitemapArray(sitemap, url = null) {
   var data;
   if (url === null) {
      console.log("Sitemap File: " + sitemap);
      var data = fs.readFileSync(sitemap, 'utf-8');
   } else {
      console.log("Sitemap Url: " + url);
      var data = url;
   };
   
   var sitemapUrls = [];
   const options = { returnOnComplete: true };
   
   return new Promise(async (resolve) => {
      await smta(data, options, (error, list) => {
         for (var url in list) {
            sitemapUrls.push(list[url].loc);
         }
         resolve(sitemapUrls);
      });
   });
}

async function getPageHeight(driver) {
   let clientHeight = await driver.executeScript("return document.documentElement.clientHeight");
   let bodyClientHeight = await driver.executeScript("return document.body.clientHeight");
   let scrollHeight = await driver.executeScript("return document.documentElement.scrollHeight");
   let bodyScrollHeight = await driver.executeScript("return document.body.scrollHeight");
   let maxDocElementHeight = Math.max(clientHeight, scrollHeight);
   let maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight);
   return Math.max(maxDocElementHeight, maxBodyHeight);
};

async function lazyLoadPage(driver) {
   let height =  await driver.executeScript("return window.innerHeight");
   let pageHeight = await getPageHeight(driver);
   for (let j = 0; j < pageHeight; j += (height - 20)) {
       await driver.executeScript("window.scrollTo(0," + j + ")");
       sleep.msleep(500);
       console.log("\nLAZY LOADING...\n")
   }
   await driver.executeScript("window.scrollTo(0, 0);");
};

async function close(eyes){
   let start = new Date();
   console.log("\nStart Time: " + start + '\n');

   await eyes.closeAsync();
   //eyes.close(false);

   let finished = new Date();
   let diff = Math.abs(start - finished);
   let duration = millisToMinutesAndSeconds(diff);
   console.log("\nTotal Close Duration: " + duration + '\n');
}

async function browser(url) {
   const { Options: ChromeOptions } = require('selenium-webdriver/chrome');

   const eyes = new Eyes(myRunner)

   let options = new ChromeOptions();

   options.addArguments("--lang=en_US");

   if (headless) {
      options.addArguments("--headless")
   } 

   if (remoteUrl && remoteUrl.includes("saucelabs")) {
      var capabilities = {
         browserName: 'chrome',
         browserVersion: 'latest',
         platformName: 'Windows 10',
         'sauce:options': {
            screenResolution: '2560x1600',
         }
      }
   } else {
      var capabilities = {
         browserName: 'chrome'
      }
   }

   let driver = await new Builder()
        .usingServer(remoteUrl)
        .forBrowser('chrome')
        .setChromeOptions(options)
        .withCapabilities(capabilities)
        .build();

   let sessionId = await driver.getSession().then(function(session){
      let sessionId = session.id_;
      console.log('\nStarting Session: ', sessionId);
      console.log('Navigating to Url: ', url + '\n'); 
      return sessionId;
   });
      
   await driver.get(url);

   if(lazyLoad) {
      await lazyLoadPage(driver);
   }

   if (config.afterPageLoad) {
      try {
         for (let step in config.afterPageLoad) {
            await eval(config.afterPageLoad[step]);
            sleep.msleep(1000);
         }
      } catch(err) {
         console.log("afterPageLoad Exception: " + err);
      }
   }
   
   if (appName === null) {
      var app = path.basename(sitemapFile, '.xml') || urlParser.parse(url).host;
   } else {
      var app = appName;
   };

   if (testName === null) {
      var test = urlParser.parse(url).path;
   } else {
      var test = testName;
   };

   const batchInfo = new BatchInfo({
      id: process.env.APPLITOOLS_BATCH_ID || myBatchId,
      name: batch,
      sequenceName: batch,
      notifyOnCompletion: true,
    });

   const configuration = eyes.getConfiguration();
   configuration.setServerUrl(serverUrl)
   configuration.setApiKey(apiKey)
   configuration.setAgentId('JS-Crawler')
   configuration.setBatch(batchInfo);
   configuration.setAppName(app);
   configuration.setTestName(test);
   configuration.setDisableBrowserFetching(true);
   configuration.setBrowsersInfo(config.browsersInfo)
   configuration.setViewportSize(viewport)
   configuration.setSendDom(sendDom)
   configuration.setIgnoreDisplacements(false)

   eyes.setConfiguration(configuration);
   eyes.setMatchLevel(eval('MatchLevel.' + level))

   if (logs) {
      eyes.setLogHandler(new ConsoleLogHandler(logs));
   }
   
   if (environment) {
      eyes.setBaselineEnvName(environment);
   };

   try {  

      if (proxyUrl) {
         let proxy = proxyUrl.split(',');
         let pProtocol = urlParser.parse(proxy[0]).protocol;
         let pHost = proxy[0];
         let pUser = proxy[1] || null;
         let pPass = proxy[2] || null;

         if(pProtocol === 'http:') {
            let isHttpOnly = true;
         } else {
            let isHttpOnly = false;
         }

         let proxyInfo = {
            url: pHost,
            username: pUser, 
            password: pPass, 
            isHttpOnly: isHttpOnly
         };

         console.log("\nProxy Settings: ", pHost, pUser, pPass, isHttpOnly, "\n");
         
         eyes.setProxy(proxyInfo);
      };
    
      await eyes.open(driver);

      let target = Target.window().enablePatterns(true).useDom(true)
      
      console.log("\nIs Full Page: " + enableFullPage)
      await eyes.check(url, target.fully(enableFullPage))

      //await eyes.closeAsync();
      await close(eyes);

   } catch(err) {
      console.error('\n' + sessionId + ' Unhandled exception: ' + err);
      console.log('Failed Url: ', url, '\n'); 
   } finally {
      console.log('\nFinished Session: ' + sessionId + ', url: ' + url + '\n');
      await eyes.abortAsync();
      await driver.quit();
   }
}

function millisToMinutesAndSeconds(millis) {
   let minutes = Math.floor(millis / 60000);
   let seconds = ((millis % 60000) / 1000).toFixed(0);
   return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

const promiseProducer = (eyes) => {
   
   if (array.length === 0) {
      return null;
   } else {
      console.log("\nURLs Remaining: " + array.length + "\n")
   }
   
   const url = array.pop();
      
   return new Promise((resolve) => {
      browser(url).then(function (url) {
         resolve(url);
      });
   });
}

function isInt(value) {
   if (isNaN(value)) {
      return false;
   }
   let x = parseFloat(value);
   return (x | 0) === x;
}

function onlyUnique(value, index, self) { 
   return self.indexOf(value) === index;
}

//Global letiables
let myBatchId = Math.round((new Date()).getTime() / 1000).toString();
console.log("My Applitools Batch ID: " + myBatchId)

let apiKey = String;
let serverUrl = String;
let enableVisualGrid = Boolean;
let logs = Boolean;
let headless = Boolean;
let sitemapFile = String;
let array = Array;
let appName = String;
let testName = String;
let level = String;
let enableFullPage = Boolean;
let proxyUrl = String;
let batch = String;
let myRunner = Object;
let sendDom = Boolean;
let lazyLoad = Boolean;
let duplicatePaths = Boolean;
let viewport = Object;
let environment = String;
let remoteUrl = String;

async function crawler() {
   program
   .version('0.1.0')
   .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
   .option('-s --sitemap [sitemap]', 'Use an already existing sitemap file. e.g. -s "/path/to/sitemap.xml" Note: This overrides the -u arg')
   .option('-m, --sitemapUrl [sitemapUrl', 'Specify a sitemap URL. e.g. -m https://www.example.com/sitemap.xml')
   .option('-b, --browsers [browsers]', 'Add the MAX number of browsers to run concurrently. e.g. -b 10. Note: Be careful with this!', parseInt)
   .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k yourLongAPIKeyyyyy')
   .option('-S --serverUrl [serverUrl]', 'Set your Applitools on-prem or private cloud server URL. (Default: https://eyes.applitools.com). e.g. -v https://youreyes.applitools.com')
   .option('--no-grid', 'Disable the Visual Grid and run locally only (Default: false). e.g. --no-grid')
   .option('--logs', 'Enable Applitools Debug Logs (Default: false). e.g. --logs')
   .option('--headless', 'Run Chrome headless (Default: false). e.g. --headless')
   .option('-U --URL [URL]', 'Add a single web URL you want to capture images for. e.g. -U https://www.google.com')
   .option('-a --appName [appName]', 'Override the appName. e.g. -a MyApp')
   .option('-t --testName [testName]', 'Override the testName. e.g. -t MyTest')
   .option('-l --level [level]', 'Set your Match Level "Layout2, Content, Strict, Exact" (Default: Strict). e.g. -l Layout2')
   .option('-p --proxy [proxy]', 'Set your Proxy URL" (Default: None). e.g. -p http://proxyhost:port,username,password')
   .option('-B --batch [batch]', 'Set your Batch Name" (Default: sitemap filename or url). e.g. -B MyBatch')
   .option('-v --viewport [viewport]', 'Set your browser viewport" (Default: 800x600). e.g. -v 1200x600')
   .option('-e --environment [environment]', 'Set a baseline environment name for cross-environment tests" (Default: none). e.g. -e "myEnvironment"')
   .parse(process.argv);
   
   apiKey = program.key || config.apiKey;
   serverUrl = program.serverUrl || config.serverUrl;
   enableVisualGrid = program.grid;
   logs = program.log || config.logs;
   headless = program.headless;
   appName = program.appName || null;
   testName = program.testName || null;
   level = program.level || 'Strict';
   enableFullPage = config.fullPage;
   proxyUrl = program.proxy || config.proxy || null;
   sendDom = config.sendDom || false;
   lazyLoad = config.lazyLoad;
   environment = program.environment || null;
   remoteUrl = config.remoteUrl || null;
   
   if (!isInt(program.browsers)) {
      program.browsers = 10;
   }
   
   let validMatchLevels = [  
      'Layout2',
      'Content',
      'Strict',
      'Exact',
      'None'
   ]

   if (!validMatchLevels.includes(level)) {
      console.log("\nUnknown Match Level: " + level);
      console.log("Please specify a valid Match Level: " + validMatchLevels + "\n");
      process.exit();
   }

   if (program.viewport) {
      let vp = program.viewport.split('x');
      viewport = { width: Number(vp[0]), height: Number(vp[1]) }
   } else {
      viewport = null;
   }

   if (program.URL) {
      let host = urlParser.parse(program.URL).host;
      if(program.batch) {
         batch = 'jsc.' + program.batch
      } else {
         batch = 'jsc.' + host 
      }
      sitemapFile = host;
      array = [program.URL];
      
      if(!testName){
         testName = host;
      }

   } else {
      //disable test names when crawling sitemap.
      testName = null;

      if (program.sitemapUrl) {
         let host = urlParser.parse(program.sitemapUrl).host;
         sitemapFile = host;
         array = await sitemapArray('', program.sitemapUrl);
      } else {
         if (program.sitemap) {
            sitemapFile = program.sitemap;
         } else {
            console.log("MY URL: " + program.url)
            sitemapFile = await SitemapGenerator(program.url, 500);
         }
         array = await sitemapArray(sitemapFile);
      }
      
      if(program.batch) {
         batch = 'jsc.' + program.batch
      } else {
         batch = 'jsc.' + path.basename(sitemapFile, '.xml') 
      }
   }

   if (enableVisualGrid) {
      let concurrency = config.testConcurrency || config.browsersInfo.length || 10;
      myRunner = new VisualGridRunner({ testConcurrency: concurrency });
   } else {
      myRunner = new ClassicRunner();
   }
 
   let start = new Date();
   console.log("\nStart Time: " + start + '\n');

   const pool = new PromisePool(promiseProducer, program.browsers);
   await pool.start();

   await myRunner.getAllTestResults(false);

   let finished = new Date();
   let diff = Math.abs(start - finished);
   let duration = millisToMinutesAndSeconds(diff);
   console.log("\nTotal Duration: " + duration + '\n');
}

crawler();