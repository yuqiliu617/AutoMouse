export interface Point {
	x: number;
	y: number;
}

type Param1 = number | Readonly<Point> | [number, number];

export class ReadonlyVector implements Readonly<Point> {
	protected _x: number;
	protected _y: number;

	constructor(point: Readonly<Point>);
	constructor(point: [x: number, y: number]);
	constructor(x: number, y: number);
	constructor(param1: Param1, param2?: number) {
		const point = this.parseParams(param1, param2);
		this._x = point.x;
		this._y = point.y;
	}

	static get origin(): ReadonlyVector {
		return new ReadonlyVector(0, 0);
	}

	get x(): number {
		return this._x;
	}
	get y(): number {
		return this._y;
	}
	get length(): number {
		return Math.hypot(this._x, this._y);
	}
	get radian(): number {
		return Math.atan2(this._y, this._x);
	}

	protected parseParams(p1: Param1, p2?: number): Point {
		return typeof p1 === "number"
			? { x: p1, y: p2! }
			: Array.isArray(p1) ? { x: p1[0], y: p1[1] } : p1;
	}

	add(v: Readonly<Point>): ReadonlyVector;
	add(v: [x: number, y: number]): ReadonlyVector;
	add(x: number, y: number): ReadonlyVector;
	add(param1: Param1, param2?: number): ReadonlyVector {
		const point = this.parseParams(param1, param2);
		return new ReadonlyVector(this._x + point.x, this._y + point.y);
	}
	sub(v: ReadonlyVector): ReadonlyVector;
	sub(v: [x: number, y: number]): ReadonlyVector;
	sub(x: number, y: number): ReadonlyVector;
	sub(param1: Param1, param2?: number): ReadonlyVector {
		const point = this.parseParams(param1, param2);
		return new ReadonlyVector(this._x - point.x, this._y - point.y);
	}
	mul(k: number): ReadonlyVector {
		return new ReadonlyVector(this._x * k, this._y * k);
	}
	div(k: number): ReadonlyVector {
		if (k == 0)
			throw new Error("Cannot divide a vector by zero.");
		return new ReadonlyVector(this._x / k, this._y / k);
	}
	reverse(): ReadonlyVector {
		return new ReadonlyVector(-this._x, -this._y);
	}
	rotate(radian: number): ReadonlyVector {
		const cos = Math.cos(radian);
		const sin = Math.sin(radian);
		return new ReadonlyVector(this._x * cos - this._y * sin, this._x * sin + this._y * cos);
	}

	dot(v: Readonly<Point>): number;
	dot(v: [x: number, y: number]): number;
	dot(x: number, y: number): number;
	dot(param1: Param1, param2?: number): number {
		const point = this.parseParams(param1, param2);
		return this._x * point.x + this._y * point.y;
	}
	cross(v: Readonly<Point>): number;
	cross(v: [x: number, y: number]): number;
	cross(x: number, y: number): number;
	cross(param1: Param1, param2?: number): number {
		const point = this.parseParams(param1, param2);
		return this._x * point.y - this._y * point.x;
	}
}

export default class Vector extends ReadonlyVector implements Point {
	constructor(point: Readonly<Point>);
	constructor(point: readonly [x: number, y: number]);
	constructor(x: number, y: number);
	constructor(param1: number | Readonly<Point> | readonly [number, number], param2?: number) {
		super(param1 as any, param2 as any);
	}

	static override get origin(): Vector {
		return new Vector(0, 0);
	}

	override get x(): number {
		return super.x;
	}
	override set x(value: number) {
		this._x = value;
	}

	override get y(): number {
		return super.y;
	}
	override set y(value: number) {
		this._y = value;
	}

	override get length(): number {
		return super.length;
	}
	override set length(value: number) {
		if (this.length == 0) {
			if (value != 0)
				throw new Error("Cannot set the length of a zero vector to a non-zero value.");
			return;
		}
		const k = value / this.length;
		this._x *= k;
		this._y *= k;
	}

	override get radian(): number {
		return super.radian;
	}
	override set radian(value: number) {
		const len = this.length;
		this._x = len * Math.cos(value);
		this._y = len * Math.sin(value);
	}

	override add(v: Readonly<Point>): Vector;
	override add(v: [x: number, y: number]): Vector;
	override add(x: number, y: number): Vector;
	override add(param1: Param1, param2?: number): Vector {
		return new Vector(super.add(param1 as any, param2 as any));
	}
	override sub(v: Vector): Vector;
	override sub(v: [x: number, y: number]): Vector;
	override sub(x: number, y: number): Vector;
	override sub(param1: Param1, param2?: number): Vector {
		return new Vector(super.sub(param1 as any, param2 as any));
	}
	override mul(k: number): Vector {
		return new Vector(super.mul(k));
	}
	override div(k: number): Vector {
		return new Vector(super.div(k));
	}
	override reverse(): Vector {
		return new Vector(super.reverse());
	}
	override rotate(radian: number): Vector {
		return new Vector(super.rotate(radian));
	}

	selfAdd(v: Readonly<Point>): this;
	selfAdd(v: [x: number, y: number]): this;
	selfAdd(x: number, y: number): this;
	selfAdd(param1: Param1, param2?: number): this {
		const point = this.parseParams(param1, param2);
		this._x += point.x;
		this._y += point.y;
		return this;
	}
	selfSub(v: Readonly<Point>): this;
	selfSub(v: [x: number, y: number]): this;
	selfSub(x: number, y: number): this;
	selfSub(param1: Param1, param2?: number): this {
		const point = this.parseParams(param1, param2);
		this._x -= point.x;
		this._y -= point.y;
		return this;
	}
	selfMul(k: number): this {
		this._x *= k;
		this._y *= k;
		return this;
	}
	selfDiv(k: number): this {
		if (k == 0)
			throw new Error("Cannot divide a vector by zero.");
		this._x /= k;
		this._y /= k;
		return this;
	}
	selfRotate(radian: number): this {
		const cos = Math.cos(radian);
		const sin = Math.sin(radian);
		this._x = this._x * cos - this._y * sin;
		this._y = this._x * sin + this._y * cos;
		return this;
	}
}