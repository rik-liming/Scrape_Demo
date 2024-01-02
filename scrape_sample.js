
import puppeteer from 'puppeteer';
const robot = require('robotjs');
const axios = require('axios');

export default async function handler(req, res) {

	axios.get(`http://localhost:50325/api/v1/browser/start?user_id=jcx5j3g`).then(async (resp) => {
    console.log(resp.data);
    if(resp.data.code === 0 && resp.data.data.ws && resp.data.data.ws.puppeteer) {
      try{
        const browser = await puppeteer.connect(
        {
            browserWSEndpoint: resp.data.data.ws.puppeteer, 
            defaultViewport: null,
            protocolTimeout: 360000,
            slowMo: 20,
            headless: true
        });

		const page = await browser.newPage();
        await page.setBypassCSP(true)

        await page.evaluate(async () => {
            Object.defineProperty(navigator, 'webdriver', {get: () => false})
        })

        try {
            // Navigate the page to a URL
            const targetUrl = 'https://www.example.com'
            await page.goto(
                targetUrl,
                { waitUntil: "load" });

            // Set screen size
            // await page.emulate({ viewport: { width: 1280, height: 960 } });
            await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 1 });

            // if has captcha, simulate human behavior
            if ((await page.$('#nocaptcha')) !== null) {

                await new Promise(resolve => setTimeout(resolve, 3000));

                const slideBtnSelector = '#nc_1_n1z'
                const slideBtn = await page.waitForSelector(slideBtnSelector)

                const slideBgSelector = '#nc_1__scale_text'
                const slideBg = await page.waitForSelector(slideBgSelector)

                const slideBtnHandle = await slideBtn.boundingBox();

                // find the element positon according to screen
                const slideBtnScreenCoordinates = await page.evaluate((slideBtnHandle) => {
                    return {
                        x: window.screenX + slideBtnHandle.x,
                        y: window.screenY + slideBtnHandle.y,
                    };
                }, slideBtnHandle);

                const originX = slideBtnScreenCoordinates.x + slideBtnHandle.width / 2
                const originY = slideBtnScreenCoordinates.y + slideBtnHandle.height / 2

                const slideBgHandle = await slideBg.boundingBox();
                const destX = originX + slideBgHandle.width - slideBtnHandle.width / 2

                // move mouse to origin position
                robot.moveMouse(originX, originY);

                // simulate mouse actions
                robot.mouseToggle("down");
                robot.setMouseDelay(2);

                // divide move mouse action in 4 parts
                // first part, calculate move action parameters
                let dragDuration = 250; // drag time(millseconds)
                let moveDistance = 50;  // how long distance the mouse will move
                let steps = Math.floor(dragDuration / 2);  // move steps
                let stepX = moveDistance / steps;         // how long distance will move in each step
                let partStartX = destX - 300               // startX in this part
                let floatY = 1                            // float distance in Y

                // move mouse step by step
                for (let i = 0; i < steps; i++) {
                    robot.moveMouseSmooth(partStartX + i * stepX, originY + floatY);
                }

                // second part, calculate move action parameters
                dragDuration = 200;
                moveDistance = 50;
                steps = Math.floor(dragDuration / 2);
                stepX = moveDistance / steps;
                partStartX = destX - 250
                floatY = 2

                for (let i = 0; i < steps; i++) {
                    robot.moveMouseSmooth(partStartX + i * stepX, originY + floatY);
                }

                // third part, calculate move action parameters
                dragDuration = 100;
                moveDistance = 100;
                steps = Math.floor(dragDuration / 2);
                stepX = moveDistance / steps;
                partStartX = destX - 200
                floatY = 0

                for (let i = 0; i < steps; i++) {
                    robot.moveMouseSmooth(partStartX + i * stepX, originY + floatY);
                }

                // fourth part, calculate move action parameters
                dragDuration = 1000;
                moveDistance = 100;
                steps = Math.floor(dragDuration / 2);
                stepX = moveDistance / steps;
                partStartX = destX - 100
                floatY = -1

                for (let i = 0; i < steps; i++) {
                    robot.moveMouseSmooth(partStartX + i * stepX, originY + floatY);
                }

                robot.mouseToggle("up");
            }

            // wait for tab selector
            await page.waitForSelector('div.od-pc-layout-detail-tab-container')
            
            if (await page.$('div.od-pc-layout-detail-tab-container') != null) {

                // Get cross border properties
                const crossBorderProperties = await page.evaluate(() => {
                    const listSelector = 'div.od-pc-offer-cross div.offer-attr-list div.offer-attr-item'
                    const itemElements = Array.from(document.querySelectorAll(listSelector));
                    return itemElements.map(itemElement => {
                        const nameElement = itemElement.querySelector('.offer-attr-item-name');
                        const valueElement = itemElement.querySelector('.offer-attr-item-value');
                        
                        return {
                            name: nameElement.textContent,
                            value: valueElement.textContent
                        }
                    });
                });

                // Get product attributes
                const productAttributes = await page.evaluate(() => {
                    const listSelector = 'div.od-pc-attribute div.offer-attr-list div.offer-attr-item'
                    const itemElements = Array.from(document.querySelectorAll(listSelector));
                    return itemElements.map(itemElement => {
                        const nameElement = itemElement.querySelector('.offer-attr-item-name');
                        const valueElement = itemElement.querySelector('.offer-attr-item-value');
                        
                        return {
                            name: nameElement.textContent,
                            value: valueElement.textContent
                        }
                    });
                });

                // Get product description
                const productDescription = await page.evaluate(() => {
                    const listSelector = 'div.od-pc-detail-description div.detail-desc-module div.content-detail img'
                    const itemElements = Array.from(document.querySelectorAll(listSelector));
                    return itemElements.map(itemElement => {
                        return itemElement.getAttribute('data-lazyload-src')
                    });
                });

                // scroll to tab element
                await page.evaluate((scrollBy) => {
                    window.scrollBy(0, -scrollBy);
                }, 200);

                // next tab
                const nextTabSelector = 'div.od-pc-layout-detail-tab-container div.next-tabs-nav-scroll > ul > li:nth-child(2)'
                await page.waitForSelector(nextTabSelector)
                await page.click(nextTabSelector)

                // buyerViews
                let buyViews = {}

                // buyer view count
                const buyerViewCountSelector = 'div.od-pc-layout-detail-tab-container div.next-tabs-nav-scroll > ul > li:nth-child(2) > div.next-tabs-tab-inner'
                const buyerViewCount = await page.evaluate((buyerViewCountSelector) => {
                    const spanElement = document.querySelector(buyerViewCountSelector);
                    const regex = /[\(\（](.*?)[\)\）]/;
                    return spanElement.innerText.match(regex)[1];
                }, buyerViewCountSelector);
                buyViews['totalCount'] = buyerViewCount

                // product star
                const productStarSelector = 'div.od-pc-layout-detail-tab-container div.od-pc-offer-evaluate div.star-info span.star-num'
                await page.waitForSelector(productStarSelector)
                const productStar = await page.evaluate((productStarSelector) => {
                    const spanElement = document.querySelector(productStarSelector);
                    return spanElement.innerText;
                }, productStarSelector);
                buyViews['productStar'] = productStar

                // evaluate rate
                const evaluateRateSelector = 'div.od-pc-layout-detail-tab-container div.od-pc-offer-evaluate div.evaluate-info span.evaluate-rate'
                const evaluateRate = await page.evaluate((evaluateRateSelector) => {
                    const spanElement = document.querySelector(evaluateRateSelector);
                    return spanElement.innerText;
                }, evaluateRateSelector);
                buyViews['evaluateRate'] = evaluateRate

                // Assemble data
                let scrapeData = {crossBorderProperties, productAttributes, productDescription, buyViews}
                const scrapeResult = {
                    "code": 200,
                    "data": scrapeData
                }
                res.status(200).send(JSON.stringify(scrapeResult))
            } else {
                const scrapeResult = {
                    "code": 500,
                    "msg": "get fail, please try again"
                }
                res.status(200).send(JSON.stringify(scrapeResult))
            }
        } catch (error) {
            console.log(error)
            res.send(error.message);
        } finally {
            // Close the browser
            await browser.close();
        }
		} catch(err){
			console.log(err.message);
		}
	}
	})
}