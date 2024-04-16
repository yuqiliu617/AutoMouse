import { Vector, ReadonlyVector } from "@automouse/utility";

import type { MouseMotionSimulator, PointWithTimestamp } from "./common";


export interface ReplayConfig extends MouseMotionSimulator.Config {
	/**
	 * The mouse motion data to be replayed.
	 */
	data: PointWithTimestamp[];
}

const replay: MouseMotionSimulator<ReplayConfig> = function* (source, dest, config) {
	const reportRate = config.reportRate ?? 100;
	const from = new ReadonlyVector(config.data[0]), to = new ReadonlyVector(config.data.last());
	const src = new ReadonlyVector(source), dst = new ReadonlyVector(dest);
	const lengthFactor = dst.sub(src).length / to.sub(from).length;
	const deltaAngle = dst.sub(src).radian - to.sub(from).radian;
	const timeFactor = config.data.length / (config.data.last().timestamp - config.data[0].timestamp) / reportRate;
	for (let i = 1; i < config.data.length; ++i) {
		const v = new Vector(config.data[i]);
		v.selfSub(config.data[0]).selfRotate(deltaAngle).selfMul(lengthFactor).selfAdd(src);
		yield {
			x: Math.roundTo(v.x, 1),
			y: Math.roundTo(v.y, 1),
			timestamp: Math.roundTo((config.data[i].timestamp - config.data[0].timestamp) * timeFactor, 1)
		};
	}
}

export default replay;