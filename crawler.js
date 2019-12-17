"use strict"; 

const urlParser = require('url');
const pry = require('pryjs')
const sitemap = require('sitemap-generator');
const fs = require('fs');
const smta = require('sitemap-to-array');
const path = require('path');
const sleep = require('sleep');
const program = require('commander');
const config = require('./applitools.config.js');
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
   BrowserType, 
   DeviceName, 
   ScreenOrientation, 
   BatchInfo,
   StitchMode,
   TestResults,
   MatchLevel
} = require('@applitools/eyes-selenium');

async function SitemapGenerator(url, maxUrls) {
   
   var host = urlParser.parse(url).host;
   var filepath = './sitemaps/' + host + '.xml';

   var generator = sitemap(url, {
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
   var clientHeight = await driver.executeScript("return document.documentElement.clientHeight");
   var bodyClientHeight = await driver.executeScript("return document.body.clientHeight");
   var scrollHeight = await driver.executeScript("return document.documentElement.scrollHeight");
   var bodyScrollHeight = await driver.executeScript("return document.body.scrollHeight");
   var maxDocElementHeight = Math.max(clientHeight, scrollHeight);
   var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight);
   return Math.max(maxDocElementHeight, maxBodyHeight);
};

async function lazyLoadPage(driver) {
   var height =  await driver.executeScript("return window.innerHeight");
   var pageHeight = await getPageHeight(driver);
   for (var j = 0; j < pageHeight; j += (height - 20)) {
       await driver.executeScript("window.scrollTo(0," + j + ")");
       sleep.msleep(500);
       console.log("\nLAZY LOADING...\n")
   }
   await driver.executeScript("window.scrollTo(0, 0);");
};

async function browser(url) {
   const { Options: ChromeOptions } = require('selenium-webdriver/chrome');

   if (enableVisualGrid) {
      var concurrency = config.browsersInfo.length || 10;
      var eyes = new Eyes(new VisualGridRunner(concurrency));
   } else {
      var eyes = new Eyes(new ClassicRunner());
   }

   myEyes = eyes;

   var options = new ChromeOptions();
   options.addArguments("--lang=en_US");

   if (headless) {
      options.addArguments("--headless")
      //var driver = await new Builder().forBrowser('chrome').setChromeOptions(new ChromeOptions(options).headless()).build();
   } else {
     // var driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
   }

   var driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

   var sessionId = await driver.getSession().then(function(session){
      var sessionId = session.id_;
      console.log('\nStarting Session: ', sessionId);
      console.log('Navigating to Url: ', url + '\n'); 
      return sessionId;
   });
      
   await driver.get(url);
   
   if (config.afterPageLoad) {
      try {
         for (var step in config.afterPageLoad) {
            await eval(config.afterPageLoad[step]);
            sleep.msleep(1000);
         }
      } catch(err) {
         console.log("afterPageLoad Exception: " + err);
      }
   }

   if(lazyLoad) {
      await lazyLoadPage(driver);
   }

   if (appName === null) {
      var app = path.basename(sitemapFile, '.xml') || urlParser.parse(url).host;
      //var app = urlParser.parse(url).host;
   } else {
      var app = appName;
   };

   if (testName === null) {
      if(duplicatePaths) {
         var test = urlParser.parse(url).host;
      } else {
         var test = urlParser.parse(url).path;
      }
   } else {
      var test = testName;
   };

   const batchInfo = new BatchInfo({
      id: myBatchId,
      name: batch,
      sequenceName: batch,
      notifyOnCompletion: true,
    });

   var conf = {
      serverUrl: serverUrl,
      apiKey: apiKey,
      appName: app,
      testName: test,
      agentId: 'JS-Crawler',
      setSendDom: sendDom,
      batch: batchInfo,
      browsersInfo: config.browsersInfo,
   };

   eyes.setConfiguration(conf);
   eyes.setMatchLevel(eval('MatchLevel.' + level))
   eyes.setLogHandler(new ConsoleLogHandler(logs));

   try {  

      if (proxyUrl) {
         var proxy = proxyUrl.split(',');
         var pProtocol = urlParser.parse(proxy[0]).protocol;
         var pHost = proxy[0];
         var pUser = proxy[1] || null;
         var pPass = proxy[2] || null;

         if(pProtocol === 'http:') {
            var isHttpOnly = true;
         } else {
            var isHttpOnly = false;
         }

         var proxyInfo = {
            url: pHost,
            username: pUser, 
            password: pPass, 
            isHttpOnly: isHttpOnly
         };

         console.log("\nProxy Settings: ", pHost, pUser, pPass, isHttpOnly, "\n");
         
         eyes.setProxy(proxyInfo);
      };

      await eyes.open(driver);

      if (enableFullPage) {
         await eyes.check(url, Target.window().fully());
      } else {
         await eyes.check(url, Target.window());
      }
      
      await eyes.closeAsync();

   } catch(err) {
      console.error('\n' + sessionId + ' Unhandled exception: ' + err.message);
      console.log('Failed Url: ', url, '\n'); 
   } finally {
      console.log('\nFinished Session: ' + sessionId + ', url: ' + url + '\n');
      await eyes.abort();
      await driver.quit();
   }
}

function millisToMinutesAndSeconds(millis) {
   var minutes = Math.floor(millis / 60000);
   var seconds = ((millis % 60000) / 1000).toFixed(0);
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
   var x = parseFloat(value);
   return (x | 0) === x;
}

function onlyUnique(value, index, self) { 
   return self.indexOf(value) === index;
}

//Global variables
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
let myEyes = Object;
let sendDom = Boolean;
let lazyLoad = Boolean;
let duplicatePaths = Boolean;

async function crawler() {
   program
   .version('0.1.0')
   .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
   .option('-s --sitemap [sitemap]', 'Use an already existing sitemap file. e.g. -s "/path/to/sitemap.xml" Note: This overrides the -u arg')
   .option('-m, --sitemapUrl [sitemapUrl', 'Specify a sitemap URL. e.g. -m https://www.example.com/sitemap.xml')
   .option('-b, --browsers [browsers]', 'Add the MAX number of browsers to run concurrently. e.g. -b 10. Note: Be careful with this!', parseInt)
   .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k yourLongAPIKeyyyyy')
   .option('-v --serverUrl [serverUrl]', 'Set your Applitools on-prem or private cloud server URL. (Default: https://eyes.applitools.com). e.g. -v https://youreyes.applitools.com')
   .option('--no-grid', 'Disable the Visual Grid and run locally only (Default: false). e.g. --no-grid')
   .option('--logs', 'Enable Applitools Debug Logs (Default: false). e.g. --logs')
   .option('--headless', 'Run Chrome headless (Default: false). e.g. --headless')
   .option('--no-fullPage', 'Disable Full Page Screenshot (Default: full page). e.g. --no-fullPage')
   .option('-U --URL [URL]', 'Add a single web URL you want to capture images for. e.g. -U https://www.google.com')
   .option('-a --appName [appName]', 'Override the appName. e.g. -a MyApp')
   .option('-t --testName [testName]', 'Override the testName. e.g. -t MyTest')
   .option('-l --level [level]', 'Set your Match Level "Layout2, Content, Strict, Exact" (Default: Strict). e.g. -l Layout2')
   .option('-p --proxy [proxy]', 'Set your Proxy URL" (Default: None). e.g. -p http://proxyhost:port,username,password')
   .option('-B --batch [batch]', 'Set your Batch Name" (Default: sitemap filename or url). e.g. -B MyBatch')
   .parse(process.argv);
   
   apiKey = program.key || config.apiKey;
   serverUrl = program.serverUrl || config.serverUrl;
   enableVisualGrid = program.grid;
   logs = program.log || config.logs;
   headless = program.headless;
   appName = program.appName || null;
   testName = program.testName || null;
   level = program.level || 'Strict';
   enableFullPage = program.fullPage || config.fullPage;
   proxyUrl = program.proxy || config.proxy || null;
   sendDom = config.sendDom || false;
   lazyLoad = config.lazyLoad;
   
   if (!isInt(program.browsers)) {
      program.browsers = 10;
   }
   
   var validMatchLevels = [  
      'Layout2',
      'Content',
      'Strict',
      'Exact'
   ]

   if (!validMatchLevels.includes(level)) {
      console.log("\nUnknown Match Level: " + level);
      console.log("Please specify a valid Match Level: " + validMatchLevels + "\n");
      process.exit();
   }

   if (program.URL) {
      var host = urlParser.parse(program.URL).host;
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
         var host = urlParser.parse(program.sitemapUrl).host;
         sitemapFile = host;
         array = await sitemapArray('', program.sitemapUrl);
      } else {
         if (program.sitemap) {
            sitemapFile = program.sitemap;
         } else {
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

   var urlPaths = {};
   array.forEach(function(x) { urlPaths[urlParser.parse(x).path] = (urlPaths[urlParser.parse(x).path] || 0)+1; });
   var pathValues = new Array();
   for (var key in urlPaths) {
      pathValues.push(urlPaths[key]);
   }
   var uniquePathValues = pathValues.filter(onlyUnique);

   if(uniquePathValues[0] === 1 && uniquePathValues.length === 1) {
      duplicatePaths = false;
   } else {
      duplicatePaths = true;
   }

   console.log('\nDuplicated URL Paths: ', duplicatePaths, '\n');

   //await eval(pry.it)
   
   var start = new Date();
   console.log("\nStart Time: " + start + '\n');

   const pool = new PromisePool(promiseProducer, program.browsers);
   await pool.start();

   await myEyes.getRunner().getAllTestResults(false);

   var finished = new Date();
   var diff = Math.abs(start - finished);
   var duration = millisToMinutesAndSeconds(diff);
   console.log("\nTotal Duration: " + duration + '\n');
}

crawler();