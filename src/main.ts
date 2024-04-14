import puppeteer from "puppeteer";

import { type MouseMotionSimulator } from "./simulators";
import solveGeeTest from "./solveGeeTest";


async function main<TConfig extends MouseMotionSimulator.Config>(
	simulator: MouseMotionSimulator<TConfig>,
	simulatorConfig: TConfig,
	count?: number
) {
	count ??= 1;
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: { width: 1600, height: 900 },
		args: ["--start-maximized"]
	});
	let sucess = 0, total = count;
	while (count--) {
		const context = await browser.createBrowserContext();
		const page = await context.newPage();
		page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0");
		await solveGeeTest(page, simulator, simulatorConfig).then(
			result => {
				if (result === true)
					++sucess;
			},
			err => {
				console.error(err);
				--total;
			}
		);
		await context.close();
	}
	console.log(`Success rate: ${sucess}/${total} (${(sucess / total * 100).toFixed(2)}%)`);
	await browser.close();
}

main();