import { Vector } from "@automouse/utility";
import Divider from "@suid/material/Divider";
import FormControl from "@suid/material/FormControl";
import FormControlLabel from "@suid/material/FormControlLabel";
import Grid from "@suid/material/Grid";
import InputLabel from "@suid/material/InputLabel";
import MenuItem from "@suid/material/MenuItem";
import Select from "@suid/material/Select";
import Stack from "@suid/material/Stack";
import SwitchControl from "@suid/material/Switch";
import TextField from "@suid/material/TextField";
import ToggleButton from "@suid/material/ToggleButton";
import ToggleButtonGroup from "@suid/material/ToggleButtonGroup";
import Typography from "@suid/material/Typography";
import { createEffect, createMemo, For, Show, type Component } from "solid-js";
import { Scatter, Line } from "solid-chartjs";
import type { AnnotationPluginOptions, AnnotationOptions } from "chartjs-plugin-annotation";
import _ from "lodash";

import createState from "../../utils/createState";
import Kinetics, { type KineticsParameters } from "../../utils/Kinetics";
import type { AreaClickEvent, AreaClickResult } from "../task";
import { colors, chartOptions } from "./common";


const AreaClickAnalysis: Component<{ data: AreaClickResult }> = props => {
	const segments = new Array<Pick<AreaClickResult, "motion" | "events">>();
	const normalizedSegments: typeof segments = [];
	let currentEvents!: AreaClickEvent[];
	const timestamps = props.data.motion.map(r => r[0]);
	const lengthFactor = 25.4 / props.data.mouseInfo.dpi; // mm per pixel
	for (const event of props.data.events) {
		if (event.type == "btnAppear")
			currentEvents = [event];
		else
			currentEvents.push(event);
		if (event.type == "mouseUp" && event.onButton) {
			const iStart = timestamps.binarySearch(currentEvents[0].timestamp, (a, b) => a - b);
			const iEnd = timestamps.binarySearch(event.timestamp, "upper", (a, b) => a - b);
			const motion = props.data.motion.slice(iStart, iEnd);
			segments.push({ motion, events: currentEvents });
			const origin = new Vector(motion[0][1], motion[0][2]);
			const angle = new Vector(currentEvents[0].x, currentEvents[0].y).sub(origin).angle;
			const startTime = motion[0][0];
			normalizedSegments.push({
				motion: motion.map(r => {
					const v = new Vector(r[1], r[2]).sub(origin);
					v.angle -= angle;
					v.length *= lengthFactor;
					return [r[0] - startTime, v.x, v.y];
				}),
				events: currentEvents.map(e => {
					const newEvent = _.cloneDeep(e);
					newEvent.timestamp -= startTime;
					const v = new Vector(e.x, e.y).sub(origin);
					v.angle -= angle;
					v.length *= lengthFactor;
					newEvent.x = v.x;
					newEvent.y = v.y;
					return newEvent;
				})
			});
		}
	}
	const state = createState({
		index: 0,
		interval: 10,
		normalize: false,
		segment: segments[0],
		parameters: new Array<{ time: number } & KineticsParameters>(),
		annotations: [] as AnnotationPluginOptions["annotations"],
		targetAreaAnnotation: undefined as AnnotationOptions | undefined
	});
	const chartState = createState({
		showX: true,
		showY: true,
		showLength: true,
	});
	const unit = createMemo(() => state.normalize ? "mm" : "px");
	createEffect(() => {
		const seg = state.normalize ? normalizedSegments[state.index] : segments[state.index];
		state.segment = seg;
		const kinetics = new Kinetics(seg.motion);
		const size = Math.floor((seg.motion.last()[0] - seg.motion[0][0]) / state.interval);
		const parameters = new Array(size) as typeof state.parameters;
		for (let i = 0; i < size; ++i) {
			const t = seg.motion[0][0] + i * state.interval;
			parameters[i] = kinetics.getParameters(t) as { time: number } & KineticsParameters;
			parameters[i].time = t;
		}
		state.parameters = parameters;
		const annotations: Record<string, AnnotationOptions> = {};
		for (let i = 1; i < seg.events.length; ++i) {
			const event = seg.events[i];
			annotations[`event${i}`] = {
				type: "line",
				xMin: event.timestamp,
				xMax: event.timestamp,
				borderColor: colors.annotation,
				borderWidth: 2,
				label: {
					content: event.type == "mouseDown" ? "⬇️" : "⬆️",
					position: "center"
				}
			}
		}
		state.annotations = annotations;
		const radius = props.data.config.size / 2 * (state.normalize ? lengthFactor : 1);
		const firstEvent = seg.events[0];
		state.targetAreaAnnotation = _.merge(
			{
				backgroundColor: colors.gold,
				label: {
					content: "Target Area",
					position: "center"
				}
			}, props.data.config.shape == "circle"
			? {
				type: "ellipse",
				xMin: firstEvent.x - radius,
				xMax: firstEvent.x + radius,
				yMin: firstEvent.y - radius,
				yMax: firstEvent.y + radius
			}
			: {
				type: "polygon",
				xValue: firstEvent.x,
				yValue: firstEvent.y,
				sides: props.data.config.shape == "triangle" ? 3 : 4,
				radius
			}
		) as AnnotationOptions;
	});
	const charts: [property: "velocity" | "acceleration" | "jerk", unitSuffix: string][] = [
		["velocity", `/ms`],
		["acceleration", `/ms²`],
		["jerk", `/ms³`]
	];
	return <Stack spacing={2} padding={2} alignItems="center" justifyContent="center">
		<Typography variant="h4">Area Click Analysis</Typography>
		<Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
			<TextField label="Area Size" value={props.data.config.size} disabled />
			<TextField label="Shape" value={props.data.config.shape} disabled />
			<Show when={props.data.mouseInfo.model != undefined}>
				<TextField label="Mouse Model" value={`${props.data.mouseInfo.brand} ${props.data.mouseInfo.model}`} disabled />
			</Show>
			<TextField label="Mouse Sensitivity" value={props.data.mouseInfo.dpi} disabled />
		</Stack>
		<Divider variant="middle" flexItem sx={{ borderColor: "rgba(255, 255, 255, 0.5)" }} style={{ margin: "32px" }} />
		<Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
			<FormControl sx={{ minWidth: 80 }}>
				<InputLabel id="index-label">Index</InputLabel>
				<Select<number>
					name="index"
					labelId="index-label"
					label="Index"
					value={state.index}
					onChange={e => state.index = e.target.value}
				>
					<For each={segments}>{(_, i) => <MenuItem value={i()}>{i() + 1}</MenuItem>}</For>
				</Select>
			</FormControl>
			<FormControl sx={{ minWidth: 80 }}>
				<InputLabel id="index-label">Interval</InputLabel>
				<Select<number>
					name="interval"
					labelId="interval-label"
					label="Interval"
					value={state.interval}
					onChange={e => state.interval = e.target.value}
				>
					<For each={[5, 10, 25, 50, 100]}>{t => <MenuItem value={t}>{`${t} ms`}</MenuItem>}</For>
				</Select>
			</FormControl>
			<ToggleButtonGroup
				value={Object.entries(chartState).filter(([_, v]) => v).map(([k]) => k)}
				onChange={(_, value) => {
					chartState.showX = value.includes("showX");
					chartState.showY = value.includes("showY");
					chartState.showLength = value.includes("showLength");
				}}
				sx={{ textWrap: "nowrap" }}
			>
				<ToggleButton value="showX">X-Component</ToggleButton>
				<ToggleButton value="showY">Y-Component</ToggleButton>
				<ToggleButton value="showLength">Vector Length</ToggleButton>
			</ToggleButtonGroup>
			<FormControlLabel
				control={<SwitchControl
					name="normalize"
					value={state.normalize}
					onChange={() => state.normalize = !state.normalize}
				/>}
				label="Normalize"
			/>
		</Stack>
		<Grid container sx={{ padding: 2 }}>
			<Grid item xs={6} sx={{ padding: 2 }}>
				<Scatter
					data={{
						datasets: [
							{
								label: `Interpolated`,
								data: state.parameters.map(p => ({ x: p.position.x, y: p.position.y })),
								backgroundColor: colors.red,
								pointStyle: "rect",
								pointRadius: 4
							},
							{
								label: `Samples`,
								data: state.segment.motion.map(r => ({ x: r[1], y: r[2] })),
								backgroundColor: colors.blue
							}
						]
					}}
					options={_.merge(_.cloneDeep(chartOptions), {
						scales: {
							x: {
								title: { display: true, text: `X-Component (${unit()})` },
							},
							y: {
								reverse: true,
								title: { display: true, text: `Y-Component (${unit()})` },
							}
						},
						plugins: {
							annotation: {
								annotations: [state.targetAreaAnnotation]
							}
						}
					})}
				/>
			</Grid>
			<For each={charts}>{([property, unitSuffix]) => {
				const title = property[0].toUpperCase() + property.substring(1);
				return <Grid item xs={6} sx={{ padding: 2 }}>
					<Line
						data={{
							datasets: [
								{
									label: `${title}`,
									data: state.parameters.map(p => ({ x: p.time, y: p[property].length })),
									backgroundColor: colors.gold,
									borderColor: colors.gold,
									borderWidth: 2,
									tension: 0.5,
									hidden: !chartState.showLength
								},
								{
									label: `${title} (X)`,
									data: state.parameters.map(p => ({ x: p.time, y: p[property].x })),
									backgroundColor: colors.green,
									borderColor: colors.green,
									borderWidth: 2,
									tension: 0.5,
									hidden: !chartState.showX
								},
								{
									label: `${title} (Y)`,
									data: state.parameters.map(p => ({ x: p.time, y: p[property].y })),
									backgroundColor: colors.blue,
									borderColor: colors.blue,
									borderWidth: 2,
									tension: 0.5,
									hidden: !chartState.showY
								}
							]
						}}
						options={_.merge(_.cloneDeep(chartOptions), {
							scales: {
								x: { title: { display: true, text: "Time (ms)" } },
								y: { title: { display: true, text: `${title} (${unit()}${unitSuffix})` } }
							},
							plugins: {
								annotation: { annotations: state.annotations }
							}
						})}
					/>
				</Grid>;
			}}</For>
		</Grid>
	</Stack>;
};

export default AreaClickAnalysis;