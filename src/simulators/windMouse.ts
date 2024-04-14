import { Vector, ReadonlyVector } from "@automouse/utility";
import "basic-type-extensions";

import type { MouseMotionSimulator, PointWithTimestamp } from "./common";


export interface WindMouseConfig extends MouseMotionSimulator.Config {
	/**
	 * Magnitude of the gravitational force. Default is 9.
	 */
	gravity?: number;

	/**
	 * Magnitude of the wind force fluctuations. Default is 3.
	 */
	wind?: number;

	/**
	 * Maximum step size (velocity clip threshold). Default is 15.
	 */
	maxStep?: number;

	/**
	 * Distance where wind behavior changes from random to damped. Default is 12.
	 */
	dampingDistance?: number;
}

const sqrt3 = Math.sqrt(3), sqrt5 = Math.sqrt(5);

/**
 * WindMouse algorithm. Calls the move_mouse kwarg with each new step.
 * Released under the terms of the GPLv3 license.
 * @see https://ben.land/post/2021/04/25/windmouse-human-mouse-movement/
 */
const windMouse: MouseMotionSimulator<WindMouseConfig> = function* (source, dest, config) {
	const conf: Required<WindMouseConfig> = {
		gravity: 9,
		wind: 3,
		maxStep: 15,
		dampingDistance: 12,
		reportRate: 100,
		...config
	};
	const dst = new ReadonlyVector(dest), cur = new Vector(source), prev = new Vector(source);
	const v = Vector.origin, w = Vector.origin;
	let dist = dst.sub(cur).length, time = 0;
	while (dist >= 1) {
		const wMag = Math.min(conf.wind, dist);
		if (dist >= conf.dampingDistance) {
			w.selfDiv(sqrt3);
			w.x += Math.randomFloat(-1, 1) * wMag / sqrt5;
			w.y += Math.randomFloat(-1, 1) * wMag / sqrt5;
		}
		else {
			w.selfDiv(sqrt3);
			if (conf.maxStep < 3)
				conf.maxStep = Math.randomFloat(3, 6);
			else
				conf.maxStep /= sqrt5;
		}
		v.selfAdd(w).selfAdd(dst.sub(cur).mul(conf.gravity / dist));
		const vMag = v.length;
		if (vMag > conf.maxStep) {
			const vClip = conf.maxStep / 2 + Math.randomFloat(conf.maxStep / 2);
			v.selfMul(vClip / vMag);
		}
		cur.selfAdd(v);
		const point: PointWithTimestamp = {
			x: Math.round(cur.x),
			y: Math.round(cur.y),
			timestamp: time += 1000 / conf.reportRate
		};
		if (prev.x !== point.x || prev.y !== point.y) {
			yield point;
			prev.x = point.x;
			prev.y = point.y;
		}
		dist = dst.sub(cur).length;
	}
}

export default windMouse;