export type Assert<T> = Exclude<T, undefined>;

export type Stringify<T extends object = object> = {
	[K in keyof T]: undefined extends T[K]
		? undefined | (Assert<T[K]> extends object ? Stringify<Assert<T[K]>> : string)
		: T[K] extends object ? Stringify<T[K]> : string;
};