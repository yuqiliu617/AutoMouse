import FormControl from "@suid/material/FormControl";
import InputLabel from "@suid/material/InputLabel";
import MenuItem from "@suid/material/MenuItem";
import TextField from "@suid/material/TextField";
import Select, { SelectChangeEvent } from "@suid/material/Select";
import "basic-type-extensions";
import Konva from "konva";
import { createSignal, Switch, Match, onMount, type Component } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

import { Rect, Circle, RegularPolygon, Text, type ShapeProps } from "../../components/SolidKonva";
import createState from "../../utils/createState";
import type { Assert, Stringify } from "../../utils/types";
import TaskPage from "./TaskPage";

export interface AreaClickConfig {
	/**
	 * Duration of the task in seconds. Default is 60.
	 */
	duration: number;

	/**
	 * Number of seconds before the button is removed. Default is 0, which means the button will stay until the user clicks it.
	 */
	ttl: number;

	/**
	 * Size of the button in pixels. Default is 100.
	 */
	size: number;

	/**
	 * Minimum variation of distance when the button is repositioned. Default is 0.
	 */
	diff: number;

	/**
	 * Shape of the button. Default is `"square"`.
	 */
	shape: "triangle" | "circle" | "square";

	/**
	 * Color of the button. Default is `"gold"`.
	 */
	color: Assert<JSX.CSSProperties["color"]>;
}

export type AreaClickEvent = {
	timestamp: number;
} & ({
	type: "btnAppear" | "btnDisappear"
	x: number;
	y: number;
} | {
	type: "mouseClick"
	x: number;
	y: number;
	onButton: boolean;
});

const AreaClick: Component = () => {
	return <TaskPage<AreaClickConfig, AreaClickEvent>
		transformConfig={formData => {
			const config = Object.fromEntries(formData.entries()) as Stringify<AreaClickConfig>;
			return {
				duration: Number(config.duration),
				ttl: Number(config.ttl),
				size: Number(config.size),
				diff: Number(config.diff),
				shape: config.shape as AreaClickConfig["shape"],
				color: "gold"
			};
		}}
		ConfigFormControls={() => {
			const [shape, setShape] = createSignal("square");
			return <>
				<TextField name="duration" label="Duration" type="number" defaultValue={60} />
				<TextField name="ttl" label="Time to live" type="number" defaultValue={0} />
				<TextField name="size" label="Size" type="number" defaultValue={100} />
				<TextField name="diff" label="Minimum variation" type="number" defaultValue={0} />
				<FormControl fullWidth>
					<InputLabel id="shape-label">Shape</InputLabel>
					<Select
						name="shape"
						labelId="shape-label"
						label="Shape"
						value={shape()}
						onChange={(e: SelectChangeEvent<AreaClickConfig["shape"]>) => setShape(e.target.value)}
					>
						<MenuItem value="triangle">Triangle</MenuItem>
						<MenuItem value="circle">Circle</MenuItem>
						<MenuItem value="square">Square</MenuItem>
					</Select>
				</FormControl>
			</>;
		}}
		TaskProcedure={props => {
			const state = createState({
				remainingTime: props.config.duration,
				btnX: -1,
				btnY: -1
			});
			const events = new Array<AreaClickEvent>();
			function refreshPosition(minVariation?: number, maxVariation?: number) {
				minVariation ??= 0;
				let x: number, y: number;
				if (minVariation <= 0 && maxVariation == undefined || state.btnX == -1 || state.btnY == -1) {
					x = Math.randomInteger(0, props.stage.width() - props.config.size);
					y = Math.randomInteger(0, props.stage.height() - props.config.size);
				}
				else {
					const w = props.stage.width() - props.config.size;
					const h = props.stage.height() - props.config.size;
					maxVariation = Math.min(
						maxVariation ?? Infinity,
						Math.hypot(Math.max(state.btnX, w - state.btnX), Math.max(state.btnY, h - state.btnY))
					);
					let len!: number, rad!: number;
					do {
						len = Math.randomFloat(minVariation, maxVariation);
						rad = Math.randomFloat(0, Math.PI * 2);
						x = state.btnX + len * Math.cos(rad);
						y = state.btnY + len * Math.sin(rad);
					} while (x < 0 || x > w || y < 0 || y > h);
				}
				state.btnX = x;
				state.btnY = y;
				events.push({ timestamp: props.getTimestamp(), type: "btnAppear", x, y });
			}
			let btnRef: Konva.Node;
			onMount(() => {
				const timer = setInterval(() => {
					if (state.remainingTime > 0)
						--state.remainingTime;
					else {
						clearInterval(timer);
						props.onComplete?.(events);
					}
				}, 1000);
				refreshPosition();
				props.stage.on("click", e => {
					events.push({
						timestamp: props.getTimestamp(),
						type: "mouseClick",
						x: e.evt.offsetX,
						y: e.evt.offsetY,
						onButton: e.target == btnRef
					});
				});
			});
			const commonProps: ShapeProps = {
				get fill() { return props.config.color },
				onClick: () => refreshPosition(props.config.diff),
				onCreate: node => btnRef = node
			};
			return <>
				<Text
					text={state.remainingTime.toString() + " s"}
					fontSize={24}
					fill={props.config.color}
					x={0}
					y={16}
					width={props.stage.width()}
					align="center"
					verticalAlign="center"
				/>
				<Switch>
					<Match when={props.config.shape == "triangle"}>
						<RegularPolygon
							{...commonProps}
							sides={3}
							radius={props.config.size / 2}
							x={state.btnX + props.config.size / 2}
							y={state.btnY + props.config.size / 2}
						/>
					</Match>
					<Match when={props.config.shape == "circle"}>
						<Circle
							{...commonProps}
							radius={props.config.size / 2}
							x={state.btnX + props.config.size / 2}
							y={state.btnY + props.config.size / 2}
						/>
					</Match>
					<Match when={props.config.shape == "square"}>
						<Rect
							{...commonProps}
							width={props.config.size}
							height={props.config.size}
							cornerRadius={props.config.size / 10}
							x={state.btnX}
							y={state.btnY}
						/>
					</Match>
				</Switch>
			</>;
		}}
	/>;
}

export default AreaClick;