export interface Point {
	x: number;
	y: number;
}

export class ReadonlyVector {
	protected _x: number;
	protected _y: number;

	constructor(point: Readonly<Point>);
	constructor(point: readonly [x: number, y: number]);
	constructor(x: number, y: number);
	constructor(param1: number | Readonly<Point> | readonly [number, number], param2?: number) {
		if (typeof param1 === "number") {
			this._x = param1;
			this._y = param2!;
		}
		else if (Array.isArray(param1))
			[this._x, this._y] = param1;
		else {
			const point = param1 as Readonly<Point>;
			this._x = point.x;
			this._y = point.y;
		}
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
	get angle(): number {
		return Math.atan2(this._y, this._x);
	}

	add(v: ReadonlyVector): ReadonlyVector {
		return new ReadonlyVector(this._x + v._x, this._y + v._y);
	}
	sub(v: ReadonlyVector): ReadonlyVector {
		return new Vector(this._x - v._x, this._y - v._y);
	}
	mul(k: number): ReadonlyVector {
		return new ReadonlyVector(this._x * k, this._y * k);
	}
	div(k: number): ReadonlyVector {
		return new ReadonlyVector(this._x / k, this._y / k);
	}
	rotate(angle: number): ReadonlyVector {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		return new ReadonlyVector(this._x * cos - this._y * sin, this._x * sin + this._y * cos);
	}

	dot(v: ReadonlyVector): number {
		return this._x * v._x + this._y * v._y;
	}
	cross(v: ReadonlyVector): number {
		return this._x * v._y - this._y * v._x;
	}
}

export default class Vector extends ReadonlyVector {
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
		const k = value / this.length;
		this._x *= k;
		this._y *= k;
	}

	override get angle(): number {
		return super.angle;
	}
	override set angle(value: number) {
		const len = this.length;
		this._x = len * Math.cos(value);
		this._y = len * Math.sin(value);
	}

	override add(v: ReadonlyVector): Vector {
		return new Vector(super.add(v));
	}
	override sub(v: ReadonlyVector): Vector {
		return new Vector(super.sub(v));
	}
	override mul(k: number): Vector {
		return new Vector(super.mul(k));
	}
	override div(k: number): Vector {
		return new Vector(super.div(k));
	}
	override rotate(angle: number): Vector {
		return new Vector(super.rotate(angle));
	}

	selfAdd(v: ReadonlyVector): this {
		this._x += v.x;
		this._y += v.y;
		return this;
	}
	selfSub(v: ReadonlyVector): this {
		this._x -= v.x;
		this._y -= v.y;
		return this;
	}
	selfMul(k: number): this {
		this._x *= k;
		this._y *= k;
		return this;
	}
	selfDiv(k: number): this {
		this._x /= k;
		this._y /= k;
		return this;
	}
	selfRotate(angle: number): this {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		this._x = this._x * cos - this._y * sin;
		this._y = this._x * sin + this._y * cos;
		return this;
	}
}