import { Vector } from "@automouse/utility";

import type { MouseMotionSimulator } from "./common";


const uniformMotion: MouseMotionSimulator = function* (source, dest, config) {
	const reportRate = config.reportRate ?? 100;
	let cur = new Vector(source.x, source.y);
	let timestamp = 0;
	const delta = new Vector(dest.x - source.x, dest.y - source.y);
	const stepCount = reportRate * (config.duration / 1000);
	const step = delta.div(stepCount);
	for (let i = 0; i < Math.ceil(stepCount) - 1; ++i) {
		cur = cur.add(step);
		timestamp += 1000 / reportRate;
		yield { x: cur.x, y: cur.y, timestamp };
	}
	yield { x: dest.x, y: dest.y, timestamp: config.duration };
}

export default uniformMotion;