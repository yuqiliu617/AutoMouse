import Button from "@suid/material/Button";
import ButtonGroup from "@suid/material/ButtonGroup";
import Checkbox from "@suid/material/Checkbox";
import FormGroup from "@suid/material/FormGroup";
import FormControlLabel from "@suid/material/FormControlLabel";
import Paper from "@suid/material/Paper";
import Stack from "@suid/material/Stack";
import TextField from "@suid/material/TextField";
import Typography from "@suid/material/Typography";
import "basic-type-extensions";
import Konva from "konva";
import { createEffect, Switch, Match, Show, type VoidComponent, type ParentProps } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ReadonlyDeep } from "type-fest";

import { Layer, Stage, Text } from "../../components/SolidKonva";
import createState, { resetState } from "../../utils/createState";


export type MouseMotionRecord = [timestamp: number, x: number, y: number];

export interface TaskEvent {
	timestamp: number;
}

export interface TaskResult<TConfig extends object, TEvent extends TaskEvent> {
	dimention: [width: number, height: number];
	config: Readonly<TConfig>;
	events: TEvent[];
	motion: MouseMotionRecord[];
}

export interface TaskPageProps<TConfig extends object, TEvent extends TaskEvent> {
	transformConfig: (formData: FormData) => TConfig;
	ConfigFormControls: VoidComponent;
	TaskProcedure: VoidComponent<{
		stage: Konva.Stage;
		config: Readonly<TConfig>;
		getTimestamp: () => number;
		onComplete: (events: TEvent[]) => void;
	}>;
	ResultControls?: VoidComponent<ReadonlyDeep<TaskResult<TConfig, TEvent>>>;
}

function TaskPage<TConfig extends object, TEvent extends TaskEvent>(props: ParentProps<TaskPageProps<TConfig, TEvent>>): JSX.Element {
	const result = {} as TaskResult<TConfig, TEvent>;
	const state = createState({
		phase: 0 as 0 | 1 | 2,
		config: undefined as Readonly<TConfig> | undefined,
	});
	const taskState = createState({
		stage: undefined as Konva.Stage | undefined,
		initialized: false,
		countdown: 3,
		startTime: -1
	});
	const resultState = createState({
		upload: true,
		save: true
	});

	const size = {} as Readonly<Record<"width" | "height", number>>;
	createEffect(() => {
		if (taskState.stage == undefined || taskState.initialized)
			return;
		Object.defineProperties(size, {
			width: { get: () => taskState.stage!.width(), configurable: true },
			height: { get: () => taskState.stage!.height(), configurable: true }
		});
		const timer = setInterval(() => {
			if (taskState.countdown == 0)
				clearInterval(timer);
			--taskState.countdown;
		}, 1000);
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
				result.motion.push([performance.now() - taskState.startTime, offsetX, offsetY]);
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
						padding={2}
						component="form"
						sx={{ width: 384 }}
						onSubmit={e => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							const config = Object.freeze(props.transformConfig(formData));
							state.config = result.config = config;
							state.phase = 1;
						}}
					>
						<props.ConfigFormControls />
						<Button type="submit" variant="contained">
							Start
						</Button>
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
									getTimestamp={() => performance.now() - taskState.startTime}
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
						padding={2}
						component="form"
						sx={{ width: 384 }}
						onSubmit={e => {
							e.preventDefault();
							console.log(`Events: ${result.events.length}, Motion: ${result.motion.length}`);
							const formData = new FormData(e.currentTarget);
							if (formData.get("upload") == "on") {
							}
							if (formData.get("save") == "on") {
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
						<Typography variant="h4">
							Results
						</Typography>
						<Show when={props.ResultControls != undefined}>
							{/* @ts-expect-error */}
							<props.ResultControls {...result} />
						</Show>
						<TextField name="mouseModel" label="Mouse Model" />
						<TextField name="dpi" label="Mouse DPI" type="number" required={resultState.upload} />
						<FormGroup>
							<FormControlLabel
								control={<Checkbox
									checked={resultState.save}
									onChange={e => resultState.save = !e.target.checked}
								/>}
								name="save"
								label="Save mouse info for later use"
							/>
							<FormControlLabel
								control={<Checkbox
									checked={resultState.upload}
									onChange={e => resultState.upload = !e.target.checked}
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