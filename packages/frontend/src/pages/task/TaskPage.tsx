import Button from "@suid/material/Button";
import ButtonGroup from "@suid/material/ButtonGroup";
import Checkbox from "@suid/material/Checkbox";
import FormGroup from "@suid/material/FormGroup";
import FormControlLabel from "@suid/material/FormControlLabel";
import InputAdornment from "@suid/material/InputAdornment";
import Paper from "@suid/material/Paper";
import Stack from "@suid/material/Stack";
import TextField from "@suid/material/TextField";
import ToggleButtonGroup from "@suid/material/ToggleButtonGroup";
import ToggleButton from "@suid/material/ToggleButton";
import Typography from "@suid/material/Typography";
import "basic-type-extensions";
import Konva from "konva";
import { createEffect, Switch, Match, Show, type VoidComponent, type ParentProps } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ReadonlyDeep } from "type-fest";

import { Layer, Stage, Text } from "../../components/SolidKonva";
import createState, { resetState } from "../../utils/createState";


export type MouseMotionRecord = [timestamp: number, x: number, y: number];

export interface MouseInfo {
	brand?: string;
	model?: string;
	leftHanded?: boolean;
	dpi: number;
}

export interface TaskEvent {
	timestamp: number;
}

export interface TaskResult<TConfig extends object = object, TEvent extends TaskEvent = TaskEvent> {
	taskName: string;
	dimention: [width: number, height: number];
	config: Readonly<TConfig>;
	events: TEvent[];
	motion: MouseMotionRecord[];
	mouseInfo: MouseInfo;
}

export function isMouseMotionRecord(value: unknown): value is MouseMotionRecord {
	if (!Array.isArray(value) || value.length != 3)
		return false;
	const record = value as MouseMotionRecord;
	return record.every(v => typeof v == "number");
}

export function isTaskResult(value: unknown): value is TaskResult {
	if (typeof value != "object" || value == null)
		return false;
	const result = value as TaskResult;
	return typeof result.taskName == "string" &&
		Array.isArray(result.dimention) && result.dimention.length == 2 &&
		typeof result.config == "object" &&
		Array.isArray(result.events) && result.events.every(event => typeof event.timestamp == "number") &&
		Array.isArray(result.motion) && result.motion.every(isMouseMotionRecord) &&
		typeof result.mouseInfo == "object" && result.mouseInfo != null && typeof result.mouseInfo.dpi == "number";
}

export interface TaskPageProps<TConfig extends object, TEvent extends TaskEvent> {
	taskName: string;
	countdown?: number;
	transformConfig: (formData: FormData) => TConfig;
	ConfigFormControls: VoidComponent<{ defaultConfig?: Readonly<TConfig> }>;
	TaskProcedure: VoidComponent<{
		stage: Konva.Stage;
		config: Readonly<TConfig>;
		getTimestamp: () => number;
		onComplete: (events: TEvent[]) => void;
	}>;
	ResultControls?: VoidComponent<ReadonlyDeep<Omit<TaskResult<TConfig, TEvent>, "mouseInfo">>>;
}

function TaskPage<TConfig extends object, TEvent extends TaskEvent>(props: ParentProps<TaskPageProps<TConfig, TEvent>>): JSX.Element {
	const result = {
		taskName: props.taskName
	} as TaskResult<TConfig, TEvent>;
	const state = createState({
		phase: 0 as 0 | 1 | 2,
		defaultConfig: undefined as TConfig | undefined,
		config: undefined as Readonly<TConfig> | undefined,
		saveConfig: true
	});
	const taskState = createState({
		stage: undefined as Konva.Stage | undefined,
		initialized: false,
		countdown: props.countdown ?? -1,
		startTime: -1
	});
	const resultState = createState({
		upload: true,
		hand: "right" as "left" | "right",
		defaultMouseInfo: undefined as MouseInfo | undefined
	});

	const size = {} as Readonly<Record<"width" | "height", number>>;
	let storageItem = localStorage.getItem(`${props.taskName}.config`);
	if (storageItem != null)
		state.defaultConfig = JSON.parse(storageItem);
	storageItem = localStorage.getItem("mouse-info");
	if (storageItem != null)
		resultState.defaultMouseInfo = JSON.parse(storageItem);
	const getTimestamp = () => Math.roundTo(performance.now() - taskState.startTime, 1);
	createEffect(() => {
		if (taskState.stage == undefined || taskState.initialized)
			return;
		Object.defineProperties(size, {
			width: { get: () => Math.roundTo(taskState.stage!.width(), 1), configurable: true },
			height: { get: () => Math.roundTo(taskState.stage!.height(), 1), configurable: true }
		});
		if (taskState.countdown != -1) {
			const timer = setInterval(() => {
				if (taskState.countdown == 0)
					clearInterval(timer);
				--taskState.countdown;
			}, 1000);
		}
		taskState.initialized = true;
	});
	createEffect(() => {
		if (taskState.countdown != -1 || taskState.stage == undefined || taskState.startTime != -1)
			return;
		taskState.startTime = performance.now();
		result.motion = [];
		taskState.stage.on("mousemove", ({ evt: { offsetX, offsetY } }) => {
			const lastRecord = result.motion.last();
			if (!lastRecord || lastRecord[1] != offsetX || lastRecord[2] != offsetY)
				result.motion.push([getTimestamp(), offsetX, offsetY]);
		});
	});

	return <Stack
		alignItems="center"
		justifyContent="center"
		sx={{ flexGrow: 1 }}
	>
		<Switch>
			<Match when={state.phase == 0}>
				<Paper elevation={4}>
					<Stack
						spacing={2}
						padding={3}
						component="form"
						sx={{ width: 384 }}
						onSubmit={e => {
							e.preventDefault();
							const skipCountdown = (e.submitter as HTMLInputElement).name == "startImmediately";
							const formData = new FormData(e.currentTarget);
							const config = Object.freeze(props.transformConfig(formData));
							state.config = result.config = config;
							if (state.saveConfig) {
								state.defaultConfig = config;
								localStorage.setItem(`${props.taskName}.config`, JSON.stringify(config));
							}
							if (skipCountdown)
								taskState.countdown = -1;
							state.phase = 1;
						}}
					>
						<props.ConfigFormControls defaultConfig={state.defaultConfig} />
						<FormGroup>
							<FormControlLabel
								control={<Checkbox
									checked={state.saveConfig}
									onChange={(_, checked) => state.saveConfig = checked}
								/>}
								label="Save config for later use"
							/>
						</FormGroup>
						<Show
							when={props.countdown != undefined}
							fallback={<Button variant="contained" type="submit" name="start">Start</Button>}
						>
						<ButtonGroup variant="contained" fullWidth>
							<Button type="submit" name="start">
								Start
							</Button>
							<Button type="submit" name="startImmediately">
								Start Immediately
							</Button>
						</ButtonGroup>
						</Show>
					</Stack>
				</Paper>
			</Match>
			<Match when={state.phase == 1}>
				<Stage
					autoSize
					containerProps={{ style: { "flex-grow": 1, width: "100%" } }}
					onCreate={stage => taskState.stage = stage}
				>
					<Show when={taskState.stage != undefined}>
						<Layer>
							<Show
								when={taskState.countdown == -1}
								fallback={<Text
									text={taskState.countdown == 0 ? "Start" : taskState.countdown.toString()}
									fontSize={64}
									fill="gold"
									x={0}
									y={0}
									width={size.width}
									height={size.height}
									align="center"
									verticalAlign="middle"
								/>}
							>
								<props.TaskProcedure
									stage={taskState.stage!}
									config={state.config!}
									getTimestamp={getTimestamp}
									onComplete={events => {
										state.phase = 2;
										result.events = events;
										result.dimention = [size.width, size.height];
									}}
								/>
							</Show>
						</Layer>
					</Show>
				</Stage>
			</Match>
			<Match when={state.phase == 2}>
				<Paper elevation={4}>
					<Stack
						spacing={2}
						padding={3}
						component="form"
						sx={{ width: 384 }}
						onSubmit={e => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							result.mouseInfo = {
								brand: formData.get("brand") as string,
								model: formData.get("model") as string,
								dpi: Number(formData.get("dpi")),
								leftHanded: resultState.hand == "left"
							};
							if (formData.get("save") == "on") {
								resultState.defaultMouseInfo = result.mouseInfo;
								localStorage.setItem("mouse-info", JSON.stringify(result.mouseInfo));
							}
							if (resultState.upload) {
								// TODO: Upload result
							}
							switch ((e.submitter as HTMLInputElement).name) {
								case "record-again":
									resetState(taskState);
									state.phase = 1;
									break;
								case "restart":
									resetState(state);
									resetState(taskState);
									break;
								case "return":
									history.back();
									break;
							}
						}}
					>
						<Typography variant="h4" align="center" fontSize={24}>
							Results
						</Typography>
						<Show when={props.ResultControls != undefined}>
							{/* @ts-expect-error */}
							<props.ResultControls {...result} />
						</Show>
						<TextField
							name="brand"
							label="Mouse Brand"
							defaultValue={resultState.defaultMouseInfo?.brand}
						/>
						<TextField
							name="model"
							label="Mouse Model"
							defaultValue={resultState.defaultMouseInfo?.model}
						/>
						<TextField
							name="dpi"
							label="Mouse Sensitivity (DPI)"
							type="number"
							required={resultState.upload}
							defaultValue={resultState.defaultMouseInfo?.dpi}
							InputProps={{ endAdornment: <InputAdornment position="end">dot/inch</InputAdornment> }}
						/>
						<ToggleButtonGroup
							exclusive
							fullWidth
							value={resultState.hand}
							onChange={(_, value) => resultState.hand = value}
						>
							<ToggleButton value="left">
								Left Hand
							</ToggleButton>
							<ToggleButton value="right">
								Right Hand
							</ToggleButton>
						</ToggleButtonGroup>
						<FormGroup>
							<FormControlLabel
								control={<Checkbox defaultChecked />}
								name="save"
								label="Save mouse info for later use"
							/>
							<FormControlLabel
								control={<Checkbox
									checked={resultState.upload}
									onChange={(_, checked) => resultState.upload = checked}
								/>}
								name="upload"
								label="Upload result"
							/>
						</FormGroup>
						<ButtonGroup variant="contained" fullWidth>
							<Button name="record-again" type="submit" variant="contained">
								Record Again
							</Button>
							<Button name="restart" type="submit" variant="contained">
								Restart
							</Button>
						</ButtonGroup>
						<Button name="return" type="submit" variant="contained">
							Return
						</Button>
					</Stack>
				</Paper>
			</Match>
		</Switch>
	</Stack>
};

export default TaskPage;