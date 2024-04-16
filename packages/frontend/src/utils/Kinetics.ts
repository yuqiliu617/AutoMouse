import { Vector, type Point } from "@automouse/utility";
import "basic-type-extensions";
import { Matrix, inverse } from "ml-matrix";

import { type MouseMotionRecord } from "../pages/task/TaskPage";


type SplineInterpolationMethod = "cubic-standard" | "cubic-half-gradient";

class Spline {
	xs: number[];

	ys: number[];

	private ks: Float64Array;

	constructor(coords: Point[], interpolationMethod?: SplineInterpolationMethod)
	constructor(xs: number[], ys: number[], interpolationMethod?: SplineInterpolationMethod)
	constructor(param1: Point[] | number[], param2?: number[] | SplineInterpolationMethod, param3?: SplineInterpolationMethod) {
		let interpolationMethod: SplineInterpolationMethod;
		if (param1.every(p => typeof p == "number")) {
			this.xs = param1 as number[];
			this.ys = param2 as number[];
			interpolationMethod = param3 ?? "cubic-standard";
		}
		else {
			const coords = param1 as Point[];
			this.xs = coords.map(p => p.x);
			this.ys = coords.map(p => p.y);
			interpolationMethod = param2 as SplineInterpolationMethod ?? "cubic-standard";
		}
		if (this.xs.length !== this.ys.length)
			throw Error("Input arrays must be of same size.");
		if (!this.xs.isAscending())
			throw Error("xs must increase monotonically.");
		this.ks = interpolationMethod == "cubic-standard"
			? Spline.interpolate(this.xs, this.ys)
			: Spline.estimate(this.xs, this.ys);
	}

	/**
	 * @see https://en.wikipedia.org/wiki/Spline_interpolation#Algorithm_to_find_the_interpolating_cubic_spline
	 */
	private static interpolate(xs: readonly number[], ys: readonly number[]): Float64Array {
		const n = xs.length - 1;
		const A = Matrix.zeros(n + 1, n + 1), B = Matrix.zeros(n + 1, 1);
		for (let i = 1; i < n; ++i) {
			const ldx = xs[i] - xs[i - 1], rdx = xs[i + 1] - xs[i];
			A.set(i, i - 1, 1 / ldx);
			A.set(i, i, 2 * (1 / ldx + 1 / rdx));
			A.set(i, i + 1, 1 / rdx);
			B.set(i, 0, 3 * ((ys[i] - ys[i - 1]) / (ldx * ldx) + (ys[i + 1] - ys[i]) / (rdx * rdx)));
		}
		const dx0 = xs[1] - xs[0], dxn = xs[n] - xs[n - 1];
		A.set(0, 0, 2 / dx0);
		A.set(0, 1, 1 / dx0);
		B.set(0, 0, 3 * (ys[1] - ys[0]) / (dx0 * dx0));
		A.set(n, n - 1, 1 / dxn);
		A.set(n, n, 2 / dxn);
		B.set(n, 0, 3 * (ys[n] - ys[n - 1]) / (dxn * dxn));
		return new Float64Array(inverse(A).mmul(B).to1DArray());
	}

	private static estimate(xs: readonly number[], ys: readonly number[]): Float64Array {
		const ks = new Float64Array(xs.length);
		for (let i = 1, prev = (ys[1] - ys[0]) / (xs[1] - xs[0]); i < xs.length - 1; ++i) {
			const cur = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
			ks[i] = (cur - prev) / 2;
			prev = cur;
		}
		let coe = inverse([
			[xs[0] ** 3, xs[0] * xs[0], xs[0], 1],
			[xs[1] ** 3, xs[1] * xs[1], xs[1], 1],
			[3 * xs[0], 1, 0, 0],
			[3 * xs[1] * xs[1], 2 * xs[1], 1, 0]
		]).mmul(Matrix.columnVector([ys[0], ys[1], 0, ks[1]])).to1DArray();
		ks[0] = 3 * coe[0] * xs[0] * xs[0] + 2 * coe[1] * xs[0] + coe[2];
		const xn_1 = xs[xs.length - 2], xn = xs[xs.length - 1];
		coe = inverse([
			[xn_1 ** 3, xn_1 * xn_1, xn_1, 1],
			[xn ** 3, xn * xn, xn, 1],
			[3 * xn_1 * xn_1, 2 * xn_1, 1, 0],
			[3 * xn, 1, 0, 0]
		]).mmul(Matrix.columnVector([ys[xs.length - 2], ys[xs.length - 1], ks[xs.length - 2], 0])).to1DArray();
		ks[xs.length - 1] = 3 * coe[0] * xn * xn + 2 * coe[1] * xn + coe[2];
		return ks;
	}

	at(x: number): [y: number, dy: number, ddy: number, dddy: number] {
		if (x < this.xs[0] || x > this.xs.last())
			throw Error("Out of bounds.");
		const idx = Math.max(1, this.xs.binarySearch(x, (a, b) => a - b));
		const dx = this.xs[idx] - this.xs[idx - 1], dy = this.ys[idx] - this.ys[idx - 1];
		const t = (x - this.xs[idx - 1]) / dx,
			a = this.ks[idx - 1] * dx - dy,
			b = -this.ks[idx] * dx + dy;
		// y = (1 - t) * this.ys[idx - 1] + t * this.ys[idx] + t * (1 - t) * (a * (1 - t) + b * t)
		const coes = [a - b, b - 2 * a, a + dy, this.ys[idx - 1]] as const;
		return [
			coes.reduce((acc, c) => acc * t + c, 0),
			((3 * coes[0] * t + 2 * coes[1]) * t + coes[2]) / dx,
			(6 * coes[0] * t + 2 * coes[1]) / (dx * dx),
			6 * coes[0] / (dx * dx * dx)
		];
	}
}

export type KineticsParameters = Record<"position" | "velocity" | "acceleration" | "jerk", Vector>;

export default class Kinetics {
	private xSpline: Spline;

	private ySpline: Spline;

	constructor(public samples: MouseMotionRecord[], interpolationMethod?: SplineInterpolationMethod) {
		if (!samples.isAscending(r => r[0]))
			samples.sort((a, b) => a[0] - b[0]);
		this.xSpline = new Spline(samples.map(r => new Vector(r[0], r[1])), interpolationMethod);
		this.ySpline = new Spline(samples.map(r => new Vector(r[0], r[2])), interpolationMethod);
	}

	getParameters(t: number): KineticsParameters {
		const [x, dx, ddx, dddx] = this.xSpline.at(t);
		const [y, dy, ddy, dddy] = this.ySpline.at(t);
		return {
			position: new Vector(x, y),
			velocity: new Vector(dx, dy),
			acceleration: new Vector(ddx, ddy),
			jerk: new Vector(dddx, dddy)
		};
	}
}