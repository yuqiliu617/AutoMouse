import { createSignal, SignalOptions } from "solid-js";

import type { Assert } from "./types";

type StateOptions<T extends object> = {
	[key in keyof T]?: SignalOptions<T[key]>;
};

export default function createState<T extends object = object>(initial: T, options?: StateOptions<T>): T {
	const state = {} as T;
	for (const key in initial) {
		const [get, set] = createSignal(initial[key], options?.[key]);
		Object.defineProperty(state, key, { get, set, enumerable: true });
	}
	return state;
}

type StateOptionsDeep<T extends object> = {
	[key in keyof T]?: Assert<T[key]> extends object ? StateOptionsDeep<Assert<T[key]>> : SignalOptions<T[key]>;
};

export function createStateDeep<T extends object = object>(initial: T, options?: StateOptionsDeep<T>): T {
	const state = {} as T;
	for (const key in initial) {
		const value = initial[key];
		if (typeof value === "object" && value !== null) {
			const deepState = createStateDeep(value, options?.[key] as any);
			Object.defineProperty(state, key, { value: deepState, enumerable: true, writable: false });
		}
		else {
			const [get, set] = createSignal(value, options?.[key]);
			Object.defineProperty(state, key, { get, set, enumerable: true });
		}
	}
	return state;
}