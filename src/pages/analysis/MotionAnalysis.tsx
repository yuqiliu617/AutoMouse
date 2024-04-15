import { Vector } from "@automouse/utility";

import FormControl from "@suid/material/FormControl";
import FormControlLabel from "@suid/material/FormControlLabel";
import Grid from "@suid/material/Grid";
import InputLabel from "@suid/material/InputLabel";
import MenuItem from "@suid/material/MenuItem";
import Select from "@suid/material/Select";
import Stack from "@suid/material/Stack";
import SwitchControl from "@suid/material/Switch";
import ToggleButton from "@suid/material/ToggleButton";
import ToggleButtonGroup from "@suid/material/ToggleButtonGroup";
import Typography from "@suid/material/Typography";
import { createEffect, For, type Component } from "solid-js";
import { Scatter, Line } from "solid-chartjs";
import _ from "lodash";

import createState from "../../utils/createState";
import Kinetics, { type KineticsParameters } from "../../utils/Kinetics";
import type { MouseMotionRecord } from "../task";
import { colors, chartOptions } from "./common";


const MotionAnalysis: Component<{ data: MouseMotionRecord[] }> = props => {
	const source = new Vector(props.data[0][1], props.data[0][2]);
	const target = new Vector(props.data.last()[1], props.data.last()[2]);
	const angle = target.sub(source).angle;
	const normalizedData: MouseMotionRecord[] = props.data.map(r => {
		const v = new Vector(r[1], r[2]);
		v.selfSub(source);
		v.angle -= angle;
		return [r[0] - props.data[0][0], v.x, v.y];
	});
	const state = createState({
		interval: 10,
		normalize: false,
		motion: props.data,
		parameters: new Array<{ time: number } & KineticsParameters>()
	});
	const chartState = createState({
		showX: true,
		showY: true,
		showLength: true,
	});
	createEffect(() => {
		const motion = state.normalize ? normalizedData : props.data;
		state.motion = motion;
		const kinetics = new Kinetics(motion);
		const size = Math.floor((motion.last()[0] - motion[0][0]) / state.interval);
		const parameters = new Array(size) as typeof state.parameters;
		for (let i = 0; i < size; ++i) {
			const t = motion[0][0] + i * state.interval;
			parameters[i] = kinetics.getParameters(t) as { time: number } & KineticsParameters;
			parameters[i].time = t;
		}
		state.parameters = parameters;
	});
	const charts: [property: "velocity" | "acceleration" | "jerk", unitSuffix: string][] = [
		["velocity", `/ms`],
		["acceleration", `/ms²`],
		["jerk", `/ms³`]
	];
	return <Stack spacing={2} padding={2} alignItems="center" justifyContent="center">
		<Typography variant="h4">Motion Analysis</Typography>
		<Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
			<FormControl sx={{ minWidth: 80 }}>
				<InputLabel id="index-label">Interval</InputLabel>
				<Select<number>
					name="interval"
					labelId="interval-label"
					label="Interval"
					value={state.interval}
					onChange={e => state.interval = e.target.value}
				>
					<For each={[5, 10, 15, 20, 30, 40, 50, 75, 100]}>{t => <MenuItem value={t}>{`${t} ms`}</MenuItem>}</For>
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
								data: state.motion.map(r => ({ x: r[1], y: r[2] })),
								backgroundColor: colors.blue
							}
						]
					}}
					options={_.merge(_.cloneDeep(chartOptions), {
						scales: {
							x: {
								title: { display: true, text: `X-Component (px)` },
							},
							y: {
								reverse: true,
								title: { display: true, text: `Y-Component (px)` },
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
								y: { title: { display: true, text: `${title} (px${unitSuffix})` } }
							}
						})}
					/>
				</Grid>;
			}}</For>
		</Grid>
	</Stack>;
};

export default MotionAnalysis;