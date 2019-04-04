//https://peter.sh/experiments/chromium-command-line-switches/

"use strict"; 

async function SitemapGenerator(url, maxUrls) {
   
   var urlParser = require('url');
   const SitemapGenerator = require('sitemap-generator');
   
   var host = urlParser.parse(url).host;
   var filepath = './sitemaps/' + host + '.xml';

   var generator = SitemapGenerator(url, {
   	maxDepth: 0,
     	filepath: filepath,
     	stripQuerystring: true,
     	maxEntriesPerFile: maxUrls
   });

   await generator.start();

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
   
   const fs = require('fs');
   const smta = require('sitemap-to-array');
   
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

async function browser(url) {
   
   var path = require('path');
   require('chromedriver');
   
   const { Options: ChromeOptions } = require('selenium-webdriver/chrome');
   const {Builder, By, until} = require('selenium-webdriver');
   
   const { ConsoleLogHandler } = require('@applitools/eyes-sdk-core');
   const { Eyes, Target, VisualGridRunner, BatchInfo } = require('@applitools/eyes-selenium');
   
   var expect = require('chai').expect;
	
   try {
      
      if (enableVisualGrid) {
         var eyes = new Eyes(new VisualGridRunner(25));
      } else {
         var eyes = new Eyes();
         eyes.setBatch({name: sitemapFile, id: myBatchId});
      }

      eyes.setLogHandler(new ConsoleLogHandler(log));
      
      var server = serverUrl || "https://eyes.applitools.com"; 
      eyes.setServerUrl(server);

      var key = apiKey || process.env.APPLITOOLS_API_KEY;
      eyes.setApiKey(key);

      if (headless) {
         var driver = new Builder().forBrowser('chrome').setChromeOptions(new ChromeOptions().headless()).build();
      } else {
         var driver = new Builder().forBrowser('chrome').build();
      }
    
      var sessionId = await driver.getSession().then(function(session){
         var sessionId = session.id_;
         console.log('\nStarting Session: ', sessionId);
         console.log('Navigating to Url: ', url + '\n'); 
         return sessionId;
      });
      
      var sleep = require('sleep');
      var millSleep = Math.floor(Math.random() * Math.floor(1000));
      sleep.msleep(millSleep);
      
      await driver.get(url);
          
      var appName = path.basename(sitemapFile, '.xml');
      
      if (enableVisualGrid) {
   
         const conf = {
            testName: appName,
            appName: url,
            serverUrl: server,
            apiKey: key,  
            batch: {
               id: myBatchId,
               name: sitemapFile,
			   },
            viewportSize: { width: 1200, height: 800 },
            browsersInfo: [
               {
                  width: 1200,
                  height: 800,
                  name: 'firefox',
               },
               {
                  width: 1200,
                  height: 800,
                  name: 'ie',
               },
               {
                  width: 1200,
                  height: 800,
                  name: 'edge',
               },
               {
                  width: 1200,
                  height: 800,
                  name: 'chrome',
               },
               {
                  deviceName: 'iPhone X',
                  screenOrientation: 'portrait',
               },
               {
                  deviceName: 'iPad',
                  screenOrientation: 'portrait',
               },
               {
                  deviceName: 'Nexus 7',
                  screenOrientation: 'portrait',
               },
               {
                  deviceName: 'Pixel 2',
                  screenOrientation: 'portrait',
               }
            ],
         };
               
         eyes.setConfiguration(conf);

         await eyes.open(driver);
     	
      } else {
         await eyes.open(driver, appName, url);
      }

      await eyes.check(url, Target.window().fully());

      if (enableVisualGrid) {
         const results = await eyes.getRunner().getAllResults();
      } else {
         await eyes.close();
      }

   } catch(err) {
      
      console.error('\n' + sessionId + ' Unhandled exception: ' + err.message);
      console.log('Failed Test: ', url + '\n'); 

   } finally {

      console.log('\nFinished Session: ' + sessionId + ', url: ' + url + '\n'); 
      try{ 
         await driver.quit();
         await eyes.abortIfNotClosed();
      } catch(error) {
         console.error('\nFinally Error: ', error + '\n'); 
      }
   }
}

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

const promiseProducer = () => {
   
   if (array.length === 0) {
      // var finished = new Date();
      // var diff = Math.abs(start - finished);
      // var duration = millisToMinutesAndSeconds(diff);
      // console.log("\nTotal Duration: " + duration);
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

//Global variables
var myBatchId = Math.round((new Date()).getTime() / 1000).toString();
console.log("My Applitools Batch ID: " + myBatchId)

let apiKey = String;
let serverUrl = String;
let enableVisualGrid = Boolean;
let log = Boolean;
let headless = Boolean;
let sitemapFile = String;
let array = Array;
let start = Date;

async function crawler() {
   
   var program = require('commander');
   
   program
   .version('0.1.0')
   .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
   .option('-s --sitemap [sitemap]', 'Use an already existing sitemap file. e.g. -s "/path/to/sitemap.xml" Note: This overrides the -u arg')
   .option('-m, --sitemapUrl [sitemapUrl', 'Specify a sitemap URL. e.g. -m https://www.example.com/sitemap.xml')
   .option('-b, --browsers [browsers]', 'Add the MAX number of browsers to run concurrently. e.g. -b 10. Note: Be careful with this!', parseInt)
   .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k yourLongAPIKeyyyyy')
   .option('-v --serverUrl [serverUrl]', 'Set your Applitools on-prem or private cloud server URL. (Default: https://eyes.applitools.com). e.g. -v https://youreyes.applitools.com')
   .option('--no-grid', 'Disable the Visual Grid and run locally only (Default: false). e.g. --no-grid')
   .option('--log', 'Enable Applitools Debug Logs (Default: false). e.g. --log')
   .option('--headless', 'Run Chrome headless (Default: false). e.g. --headless')
   .parse(process.argv);
   
   apiKey = program.key
   serverUrl = program.serverUrl
   enableVisualGrid = program.grid;
   log = program.log;
   headless = program.headless;
   
   if (!isInt(program.browsers)) {
      program.browsers = 10;
   }
   
   if (program.sitemapUrl) {
      
      var urlParser = require('url');
      var host = urlParser.parse(program.sitemapUrl).host;
      sitemapFile = host;
      array = await sitemapArray('', program.sitemapUrl);
   
   } else {
      
      if (program.sitemap) {
         sitemapFile = program.sitemap
      } else {
         sitemapFile = await SitemapGenerator(program.url, 500);
      }
      
      array = await sitemapArray(sitemapFile);
   }
   
   var start = new Date();
   console.log("\nStart Time: " + start);
   
   const PromisePool = require('es6-promise-pool');
   const pool = new PromisePool(promiseProducer, program.browsers);
   await pool.start();
}

crawler();