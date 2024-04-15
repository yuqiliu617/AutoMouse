import { Vector } from "@automouse/utility";
import { Bezier } from "bezier-js";

import type { MouseMotionSimulator } from "./common";


export interface BezierCurveConfig extends MouseMotionSimulator.Config {
	/**
	 * Duration of the motion in milliseconds.
	 */
	duration: number;

	/**
	 * The maximum or range of the length of the control points to the source and destination points.
	 * Default is 1/3 of the distance between the source and destination points.
	 */
	controlPointRadius?: number | [min: number, max: number];

	/**
	 * The maximum or range of the angle of the control points to the source and destination points. Should be within [0, π].
	 * Default is π / 4.
	 */
	controlPointAngle?: number | [min: number, max: number];
}

const bezierCurve: MouseMotionSimulator<BezierCurveConfig> = function* (source, dest, config) {
	const reportRate = config.reportRate ?? 100;
	const displacement = new Vector(dest).selfSub(source);
	const radiusRange: [number, number] = config.controlPointRadius == undefined
		? [0, displacement.length / 3]
		: Array.isArray(config.controlPointRadius)
			? config.controlPointRadius
			: [0, config.controlPointRadius];
	const angelRange: [number, number] = config.controlPointAngle == undefined
		? [0, Math.PI / 4]
		: Array.isArray(config.controlPointAngle)
			? config.controlPointAngle
			: [0, config.controlPointAngle];

	const cp1 = new Vector(displacement);
	const cp2 = cp1.reverse();
	cp1.length = Math.randomFloat(radiusRange[0], radiusRange[1]);
	cp2.length = Math.randomFloat(radiusRange[0], radiusRange[1]);
	cp1.selfRotate(Math.randomFloat(angelRange[0], angelRange[1]) * (Math.random() < 0.5 ? 1 : -1));
	cp2.selfRotate(Math.randomFloat(angelRange[0], angelRange[1]) * (Math.random() < 0.5 ? 1 : -1));
	cp1.selfAdd(source);
	cp2.selfAdd(dest);

	const bezier = new Bezier(source, cp1, cp2, dest);
	const step = 1000 / config.duration / reportRate;
	for (let t = step; t < 1; t += step) {
		const point = bezier.get(t);
		yield {
			x: Math.roundTo(point.x, 1),
			y: Math.roundTo(point.y, 1),
			timestamp: Math.roundTo(t * config.duration, 1)
		};
	}
	yield { x: dest.x, y: dest.y, timestamp: config.duration };
}

export default bezierCurve;