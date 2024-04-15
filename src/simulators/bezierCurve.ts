import type { Point } from "@automouse/utility";
import { Bezier } from "bezier-js";

import type { MouseMotionSimulator } from "./common";


export interface BezierCurveConfig extends MouseMotionSimulator.Config {
	/**
	 * Duration of the motion in milliseconds.
	 */
	duration: number;

	/**
	 * The control point of the cubic bezier curve at the beginning.
	 * Or if `controlPoint2` is omitted, the only control point of the quadratic bezier curve.
	 */
	controlPoint1: Point;

	/**
	 * The control point of the cubic bezier curve at the end.
	 */
	controlPoint2?: Point;
}

const bezierCurve: MouseMotionSimulator<BezierCurveConfig> = function* (source, dest, config) {
	const reportRate = config.reportRate ?? 100;
	const bezier = config.controlPoint2
		? new Bezier([source, config.controlPoint1, config.controlPoint2, dest])
		: new Bezier([source, config.controlPoint1, dest]);
	const step = 1000 / config.duration / reportRate;
	for (let t = step; t < 1; t += step) {
		const point = bezier.get(t);
		yield { x: point.x, y: point.y, timestamp: t * config.duration };
	}
	yield { x: dest.x, y: dest.y, timestamp: config.duration };
}

export default bezierCurve;