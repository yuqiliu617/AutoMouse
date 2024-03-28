import { createSignal, SignalOptions } from "solid-js";

const resetSymbol = Symbol("reset");

export type StateOptions<T extends object> = {
	[key in keyof T]?: SignalOptions<T[key]>;
};

export default function createState<T extends object = object>(initial: T, options?: StateOptions<T>): T {
	const state = {} as T;
	for (const key in initial) {
		const [get, set] = createSignal(initial[key], options?.[key]);
		Object.defineProperty(state, key, { get, set, enumerable: true });
	}
	Object.defineProperty(state, resetSymbol, {
		value: () => {
			for (const key in state)
				state[key] = initial[key];
		},
		writable: false
	});
	return state;
}

export type StateDeep<T extends object = object> = {
	[K in keyof T]: T[K] extends object ? StateDeep<T[K]> : T[K];
};

export type StateOptionsDeep<T extends object> = {
	[K in keyof T]?: T[K] extends object ? StateOptionsDeep<T[K]> : SignalOptions<T[K]>;
};

export function createStateDeep<T extends object = object>(initial: T, options?: StateOptionsDeep<T>): StateDeep<T> {
	const state = {} as StateDeep<T>;
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
	Object.defineProperty(state, resetSymbol, {
		value: () => {
			for (const key in state) {
				const value = state[key];
				if (typeof value === "object" && value !== null)
					(value as any)[resetSymbol]();
				else
					state[key] = initial[key];
			}
		},
		writable: false
	});
	return state;
}

export function resetState<T extends object = object>(state: T) {
	(state as any)[resetSymbol]?.();
}