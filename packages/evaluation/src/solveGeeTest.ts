import { Vector } from "@automouse/utility";
import "basic-type-extensions";
import Jimp from "jimp";
import { cv } from "opencv-wasm";
import pixelmatch from "pixelmatch";
import type { Page } from "puppeteer";

import type { MouseMotionSimulator } from "./simulators";


type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;

async function prepare(page: Page) {
	await page.waitForSelector(".tab-item.tab-item-1");
	await page.click(".tab-item.tab-item-1");

	await page.waitForSelector("[aria-label=\"Click to verify\"]");
	await Promise.sleep(500);
	await page.click("[aria-label=\"Click to verify\"]");

	await page.waitForSelector(".geetest_canvas_img canvas", { visible: true });
	await Promise.sleep(1000);
}

async function getImages(page: Page): Promise<Record<"captcha" | "puzzle" | "original", JimpImage>> {
	const images = await page.$$eval(
		".geetest_canvas_img canvas",
		canvases => canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64,/, ""))
	);
	if (images.length !== 3)
		throw new Error("Expected 3 images, but got " + images.length);

	const jimpImages = await images.mapAsync(img => Jimp.read(Buffer.from(img, "base64")));
	return {
		captcha: jimpImages[0],
		puzzle: jimpImages[1],
		original: jimpImages[2]
	};
}

function findPuzzlePosition(puzzleImg: JimpImage): Vector {
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

	return new Vector(Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00));
}

function findDiffPosition(diffImage: JimpImage): Vector {
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

	return new Vector(Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00));
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

export default async function solveGeeTest<TConfig extends MouseMotionSimulator.Config>(
	page: Page,
	simulator: MouseMotionSimulator<TConfig>,
	simulatorConfig: TConfig
): Promise<boolean | void> {
	await page.goto("https://www.geetest.com/en/demo", { waitUntil: "networkidle2" });
	await prepare(page);

	const images = await getImages(page);

	const puzzle = findPuzzlePosition(images.puzzle);
	const diffImg = getDiffImage(images.original, images.captcha);
	const slot = findDiffPosition(diffImg);

	const sliderHandle = (await page.$(".geetest_slider_button"))!;
	const handle = (await sliderHandle.boundingBox())!;

	const source = new Vector(handle.x + handle.width / 2, handle.y + handle.height / 2);
	const target = source.add(new Vector(slot.x - puzzle.x, Math.randomInteger(-handle.height, handle.height)));

	await page.mouse.move(source.x, source.y);
	await page.mouse.down();
	const startTime = performance.now();
	for (const point of simulator(source, target, simulatorConfig)) {
		let curTime = performance.now() - startTime;
		if (curTime > point.timestamp)
			continue;
		await page.mouse.move(point.x, point.y);
		curTime = performance.now() - startTime;
		if (point.timestamp - curTime > 1)
			await Promise.sleep(point.timestamp - curTime);
	}
	await page.mouse.up();

	await Promise.sleep(2000);
	const holderClassList = await page.evaluate(() => document.querySelector(".geetest_holder")?.classList);
	if (holderClassList) {
		const classes = Object.values(holderClassList);
		if (classes.includes("geetest_radar_success"))
			return true;
		else if (classes.includes("geetest_radar_error"))
			return false;
	}
}