import type { Point } from "@automouse/utility";

export interface PointWithTimestamp extends Point {
	timestamp: number;
}

export namespace MouseMotionSimulator {
	export interface Config {
		/**
		 * The rate at which the mouse should report its position. Unit is in Hz. Default is 100.
		 */
		reportRate?: number;
	}
}

export interface MouseMotionSimulator<TConfig extends MouseMotionSimulator.Config = MouseMotionSimulator.Config> {
	(source: Readonly<Point>, dest: Readonly<Point>, config: TConfig): Generator<PointWithTimestamp>;
};