import puppeteer from 'puppeteer';
import mocker from 'puppeteer-request-mocker'

describe('smoke', () => {
    let browser = null;
    let page = null;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false
        });
    });

    beforeEach(async () => {
        const browserContext = browser.browserContexts()[0];
        await browserContext.overridePermissions('http://localhost:9080', ['geolocation']);
        page = await browserContext.newPage();
        await mocker.start({
            page: page,
            mockList: [
 //               'openstreetmap.org',
                '35.157.16.134'
            ],
//            verbose: true
        });
        await page.setGeolocation({
            latitude: 60.30,
            longitude: 24.74
        });

        await page.goto('http://localhost:9080/', {timeout: 90000, waitUntil: 'networkidle2'})
    }, 90000);


    afterEach(async () => {
        await mocker.stop();
        await page.close()
    });

    afterAll(async () => {
        await browser.close();
    });

    it('Page should have a Title', async () => {
        const pageTitle = await page.title();
        expect(pageTitle).toBe('Front')
    });

    it('Default values for coordinate inputs should be near users location', async () => {
        await page.waitFor(5000); // should wait for geolocation to finish?
        const longitudeInput = await page.$eval('#longitude-input', el => el.value);
        const latitudeInput = await page.$eval('#latitude-input', el => el.value);

        expect(latitudeInput).toBeCloseTo(60.30);
        expect(longitudeInput).toBeCloseTo(24.74)

    }, 6000);

    it('no parking space inputs', async () => {
        const parkingSpaceInputs = await page.$$('#parking-spaces div');
        expect(parkingSpaceInputs.length).toBe(0);
    });

    describe('Clicking <lisää paikka>', () => {

        beforeEach(async () => {
            await page.click('#add-parking-space');
        });

        it('will add input for parking space', async () => {
            const parkingSpaceInputs = await page.$$('#parking-spaces div');

            expect(parkingSpaceInputs.length).toBe(1);
        })
    })


});