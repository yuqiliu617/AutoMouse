export interface Point {
	x: number;
	y: number;
}

export interface PointWithTimestamp extends Point {
	timestamp: number;
}

export namespace MouseMotionSimulator {
	export interface Config {
		/**
		 * The rate at which the mouse should report its position. Unit is in Hz. Default is 100.
		 */
		reportRate?: number;

		/**
		 * The duration of the simulated motion. Unit is in milliseconds.
		 */
		duration: number;
	}
}

export interface MouseMotionSimulator<TConfig extends MouseMotionSimulator.Config = MouseMotionSimulator.Config> {
	(source: Point, dest: Point, config: TConfig): Generator<PointWithTimestamp>;
};