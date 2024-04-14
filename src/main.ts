import puppeteer, { type Page } from "puppeteer";
import Jimp from "jimp";
import pixelmatch from "pixelmatch";
import { cv } from "opencv-wasm";


type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;

async function wait(ms: number) {
	return new Promise(r => setTimeout(r, ms));
}

async function prepare(page: Page) {
	await page.waitForSelector(".tab-item.tab-item-1");
	await page.click(".tab-item.tab-item-1");

	await page.waitForSelector("[aria-label=\"Click to verify\"]");
	await wait(500);
	await page.click("[aria-label=\"Click to verify\"]");

	await page.waitForSelector(".geetest_canvas_img canvas", { visible: true });
	await wait(1000);
}

async function getImages(page: Page): Promise<Record<"captcha" | "puzzle" | "original", JimpImage>> {
	const images = await page.$$eval(
		".geetest_canvas_img canvas",
		canvases => canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64,/, ""))
	);
	if (images.length !== 3)
		throw new Error("Expected 3 images, but got " + images.length);

	const jimpImages = await Promise.all(images.map(img => Jimp.read(Buffer.from(img, "base64"))));
	return {
		captcha: jimpImages[0],
		puzzle: jimpImages[1],
		original: jimpImages[2]
	};
}

function findPuzzlePosition(puzzleImg: JimpImage): [x: number, y: number] {
	const srcPuzzle = cv.matFromImageData(puzzleImg.bitmap);
	const dstPuzzle = new cv.Mat();

	cv.cvtColor(srcPuzzle, srcPuzzle, cv.COLOR_BGR2GRAY);
	cv.threshold(srcPuzzle, dstPuzzle, 127, 255, cv.THRESH_BINARY);

	const kernel = cv.Mat.ones(5, 5, cv.CV_8UC1);
	const anchor = new cv.Point(-1, -1);
	cv.dilate(dstPuzzle, dstPuzzle, kernel, anchor, 1);
	cv.erode(dstPuzzle, dstPuzzle, kernel, anchor, 1);

	const contours = new cv.MatVector();
	const hierarchy = new cv.Mat();
	cv.findContours(dstPuzzle, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

	const contour = contours.get(0);
	const moment = cv.moments(contour);

	return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)];
}

function findDiffPosition(diffImage: JimpImage): [x: number, y: number] {
	const src = cv.matFromImageData(diffImage.bitmap);

	const dst = new cv.Mat();
	const kernel = cv.Mat.ones(5, 5, cv.CV_8UC1);
	const anchor = new cv.Point(-1, -1);

	cv.threshold(src, dst, 127, 255, cv.THRESH_BINARY);
	cv.erode(dst, dst, kernel, anchor, 1);
	cv.dilate(dst, dst, kernel, anchor, 1);
	cv.erode(dst, dst, kernel, anchor, 1);
	cv.dilate(dst, dst, kernel, anchor, 1);

	cv.cvtColor(dst, dst, cv.COLOR_BGR2GRAY);
	cv.threshold(dst, dst, 150, 255, cv.THRESH_BINARY_INV);

	const contours = new cv.MatVector();
	const hierarchy = new cv.Mat();
	cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

	const contour = contours.get(0);
	const moment = cv.moments(contour);

	return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)];
}

function getDiffImage(img1: JimpImage, img2: JimpImage): JimpImage {
	const { width, height } = img1.bitmap;
	if (img2.bitmap.width !== width || img2.bitmap.height !== height)
		throw new Error("Images must have the same dimensions");
	const diffImage = new Jimp(width, height);
	pixelmatch(
		img1.bitmap.data,
		img2.bitmap.data,
		diffImage.bitmap.data,
		width,
		height,
		{
			includeAA: true,
			threshold: 0.2
		}
	);
	return diffImage;
}

async function run(page: Page): Promise<boolean | void> {
	await page.goto("https://www.geetest.com/en/demo", { waitUntil: "networkidle2" });
	await prepare(page);

	const { original, captcha } = await getImages(page);
	const diffImage = getDiffImage(original, captcha);

	let [cx, cy] = findDiffPosition(diffImage);

	const sliderHandle = (await page.$(".geetest_slider_button"))!;
	const handle = (await sliderHandle.boundingBox())!;

	let xPosition = handle.x + handle.width / 2;
	let yPosition = handle.y + handle.height / 2;
	await page.mouse.move(xPosition, yPosition);
	await page.mouse.down();

	xPosition = handle.x + cx - handle.width / 2;
	yPosition = handle.y + handle.height / 3;
	await page.mouse.move(xPosition, yPosition, { steps: 25 });
	await wait(1000);

	const { puzzle } = await getImages(page);
	let [cxPuzzle, cyPuzzle] = findPuzzlePosition(puzzle);

	xPosition = xPosition + cx - cxPuzzle;
	yPosition = handle.y + handle.height / 2;
	await page.mouse.move(xPosition, yPosition, { steps: 5 });
	await page.mouse.up();
	await wait(3000);

	const holderClassList = await page.evaluate(() => document.querySelector(".geetest_holder")?.classList);
	if (holderClassList) {
		const classes = Object.values(holderClassList);
		if (classes.includes("geetest_radar_success"))
			return true;
		else if (classes.includes("geetest_radar_error"))
			return false;
	}
}

async function main(count?: number) {
	count ??= 1;
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: { width: 1366, height: 768 }
	});
	let sucess = 0;
	const total = count;
	while (count--) {
		const context = await browser.createBrowserContext();
		const page = await context.newPage();
		const result = await run(page);
		if (result === true)
			++sucess;
		await context.close();
	}
	console.log(`Success rate: ${sucess}/${total} (${(sucess / total * 100).toFixed(2)}%)`);
	await browser.close();
}

main();