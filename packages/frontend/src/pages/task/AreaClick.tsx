import FormControl from "@suid/material/FormControl";
import InputAdornment from "@suid/material/InputAdornment";
import InputLabel from "@suid/material/InputLabel";
import MenuItem from "@suid/material/MenuItem";
import TextField from "@suid/material/TextField";
import ToggleButtonGroup from "@suid/material/ToggleButtonGroup";
import ToggleButton from "@suid/material/ToggleButton";
import Select from "@suid/material/Select";
import "basic-type-extensions";
import Konva from "konva";
import { createMemo, onMount, Show, Switch, Match, type Component } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

import { Rect, Circle, RegularPolygon, Text, type ShapeProps } from "../../components/SolidKonva";
import createState from "../../utils/createState";
import type { Assert } from "../../utils/types";
import TaskPage, { isTaskResult, type TaskEvent, type TaskResult } from "./TaskPage";


export interface AreaClickConfig {
	/**
	 * Task mode. Default is `"clicks"`.
	 * @note Under `"time"` mode, the task will last for the specified duration.
	 * @note Under `"clicks"` mode, the task will last until the user clicks the button a certain number of times.
	 */
	mode: "time" | "clicks";

	/**
	 * Under `"time"` mode, the duration of the task in seconds. Default is 60.
	 * Under `"clicks"` mode, the number of clicks required to complete the task. Default is 10.
	 */
	amount: number;

	/**
	 * Size of the button in pixels. Default is `50`.
	 */
	size: 5 | 20 | 50 | 100;

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

export type AreaClickEvent = TaskEvent & ({
	type: "btnAppear"
	x: number;
	y: number;
} | {
	type: "mouseDown" | "mouseUp";
	x: number;
	y: number;
	onButton: boolean;
});

export type AreaClickResult = TaskResult<AreaClickConfig, AreaClickEvent>;

export function isAreaClickResult(value: unknown): value is AreaClickResult {
	if (!isTaskResult(value) || value.taskName != "area-click")
		return false;
	const config = value.config as AreaClickConfig;
	const events = value.events as AreaClickEvent[];
	return events.every(e => {
		return typeof e.x == "number" &&
			typeof e.y == "number" &&
			(e.type == "btnAppear" || (e.type == "mouseDown" || e.type == "mouseUp") && typeof e.onButton == "boolean");
	}) && (
			(config.mode === "time" || config.mode === "clicks") &&
			typeof config.amount == "number" &&
			typeof config.size == "number" &&
			typeof config.diff == "number" &&
			(config.shape == "triangle" || config.shape == "circle" || config.shape == "square") &&
			typeof config.color == "string"
		);
}

const AreaClick: Component = () => {
	const state = createState({
		mode: "clicks" as AreaClickConfig["mode"],
		size: 50 as AreaClickConfig["size"],
		shape: "square" as AreaClickConfig["shape"],
	});

	return <TaskPage<AreaClickConfig, AreaClickEvent>
		taskName="area-click"
		countdown={3}
		transformConfig={formData => {
			const config = Object.fromEntries(formData.entries());
			return {
				mode: state.mode,
				amount: Number(config[state.mode == "time" ? "duration" : "count"]),
				size: state.size,
				diff: Number(config.diff),
				shape: state.shape,
				color: "gold"
			};
		}}
		ConfigFormControls={props => {
			if (props.defaultConfig) {
				state.mode = props.defaultConfig.mode;
				state.size = props.defaultConfig.size;
				state.shape = props.defaultConfig.shape;
			}
			return <>
				<ToggleButtonGroup
					exclusive
					fullWidth
					value={state.mode}
					onChange={(_, value) => state.mode = value}
				>
					<ToggleButton value="clicks">
						Clicks Mode
					</ToggleButton>
					<ToggleButton value="time">
						Time Mode
					</ToggleButton>
				</ToggleButtonGroup>
				<Show
					when={state.mode == "clicks"}
					fallback={
						<TextField
							name="duration"
							label="Duration"
							type="number"
							defaultValue={props.defaultConfig && props.defaultConfig.mode == "time" ? props.defaultConfig.amount : 30}
							inputProps={{ min: 5, max: 60 }}
							InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
						/>
					}
				>
					<TextField
						name="count"
						label="Number of Clicks"
						type="number"
						defaultValue={props.defaultConfig && props.defaultConfig.mode == "clicks" ? props.defaultConfig.amount : 20}
						inputProps={{ min: 5, max: 50 }}
						InputProps={{ endAdornment: <InputAdornment position="end">click</InputAdornment> }}
					/>
				</Show>
				<FormControl fullWidth>
					<InputLabel id="size-label">Size</InputLabel>
					<Select<typeof state.size>
						name="size"
						labelId="size-label"
						label="Size"
						value={state.size}
						onChange={e => state.size = e.target.value}
					>
						<MenuItem value={5}>Tiny</MenuItem>
						<MenuItem value={20}>Small</MenuItem>
						<MenuItem value={50}>Medium</MenuItem>
						<MenuItem value={100}>Large</MenuItem>
					</Select>
				</FormControl>
				<TextField
					name="diff"
					label="Minimum variation"
					type="number"
					defaultValue={props.defaultConfig?.diff ?? 0}
					InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
				/>
				<FormControl fullWidth>
					<InputLabel id="shape-label">Shape</InputLabel>
					<Select<AreaClickConfig["shape"]>
						name="shape"
						labelId="shape-label"
						label="Shape"
						value={state.shape}
						onChange={e => state.shape = e.target.value}
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
				remainingAmount: props.config.amount,
				btnX: -1,
				btnY: -1
			});
			const events = new Array<AreaClickEvent>();
			const radius = createMemo(() => props.config.size / 2);
			function refreshPosition(minVariation?: number, maxVariation?: number) {
				minVariation ??= 0;
				let x: number, y: number;
				const w = props.stage.width(), h = props.stage.height();
				if (minVariation <= 0 && maxVariation == undefined || state.btnX == -1 || state.btnY == -1) {
					x = Math.randomInteger(radius(), w - radius());
					y = Math.randomInteger(radius(), h - radius());
				}
				else {
					maxVariation = Math.min(
						maxVariation ?? Infinity,
						Math.hypot(
							Math.max(state.btnX - radius(), w - radius() - state.btnX),
							Math.max(state.btnY - radius(), h - radius() - state.btnY)
						)
					);
					let len!: number, rad!: number;
					do {
						len = Math.randomFloat(minVariation, maxVariation);
						rad = Math.randomFloat(0, Math.PI * 2);
						x = state.btnX + Math.round(len * Math.cos(rad));
						y = state.btnY + Math.round(len * Math.sin(rad));
					} while (x < radius() || x > w - radius() || y < radius() || y > h - radius());
				}
				state.btnX = x;
				state.btnY = y;
				events.push({ timestamp: props.getTimestamp(), type: "btnAppear", x, y });
			}
			let btnRef: Konva.Node;
			onMount(() => {
				if (props.config.mode == "time") {
					const timer = setInterval(() => {
						if (state.remainingAmount > 0)
							--state.remainingAmount;
						else {
							clearInterval(timer);
							props.onComplete?.(events);
						}
					}, 1000);
				}
				refreshPosition();
				props.stage.on("mousedown", e => {
					events.push({
						timestamp: props.getTimestamp(),
						type: "mouseDown",
						x: e.evt.offsetX,
						y: e.evt.offsetY,
						onButton: e.target == btnRef
					});
				});
				props.stage.on("mouseup", e => {
					events.push({
						timestamp: props.getTimestamp(),
						type: "mouseUp",
						x: e.evt.offsetX,
						y: e.evt.offsetY,
						onButton: e.target == btnRef
					});
				});
			});
			const commonProps: ShapeProps = {
				get fill() { return props.config.color },
				onClick() {
					if (props.config.mode == "clicks" && --state.remainingAmount == 0)
						setTimeout(() => props.onComplete?.(events));
					else
						setTimeout(() => refreshPosition(props.config.diff));
				},
				onCreate: node => btnRef = node
			};
			return <>
				<Text
					text={`${state.remainingAmount} ${props.config.mode == "clicks" ? "clicks" : "s"}`}
					fontSize={24}
					fill={props.config.color}
					x={0}
					y={0}
					padding={16}
					width={props.stage.width()}
					align="right"
					verticalAlign="center"
				/>
				<Switch>
					<Match when={props.config.shape == "triangle"}>
						<RegularPolygon
							{...commonProps}
							sides={3}
							radius={radius()}
							x={state.btnX}
							y={state.btnY}
						/>
					</Match>
					<Match when={props.config.shape == "circle"}>
						<Circle
							{...commonProps}
							radius={radius()}
							x={state.btnX}
							y={state.btnY}
						/>
					</Match>
					<Match when={props.config.shape == "square"}>
						<Rect
							{...commonProps}
							width={props.config.size}
							height={props.config.size}
							cornerRadius={props.config.size / 10}
							x={state.btnX - radius()}
							y={state.btnY - radius()}
						/>
					</Match>
				</Switch>
			</>;
		}}
	/>;
}

export default AreaClick;