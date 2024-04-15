import Button from "@suid/material/Button";
import Stack from "@suid/material/Stack";
import CloudUploadIcon from "@suid/icons-material/CloudUpload";
import { Chart, Title, Tooltip, Legend, Colors } from "chart.js";
import AnnotationPlugin from "chartjs-plugin-annotation";
import { onMount, Switch, Match, type Component } from "solid-js";

import createState from "../../utils/createState";
import { isTaskResult, type TaskResult, type MouseMotionRecord, type AreaClickResult } from "../task";
import AreaClickAnalysis from "./AreaClickAnalysis";


const Analysis: Component = () => {
	onMount(() => {
		Chart.register(Title, Tooltip, Legend, Colors, AnnotationPlugin);
	});

	const state = createState({
		data: undefined as TaskResult | undefined,
		motionData: undefined as MouseMotionRecord[] | undefined
	});

	return <Switch>
		<Match when={state.data == undefined && state.motionData == undefined}>
			<Stack
				alignItems="center"
				justifyContent="center"
				sx={{ flexGrow: 1 }}
			>
				<Button
					component="label"
					role={undefined}
					variant="contained"
					tabIndex={-1}
					startIcon={<CloudUploadIcon />}
				>
					Upload Result
					<input
						type="file"
						name="file"
						accept=".json"
						hidden
						onChange={async e => {
							const file = e.currentTarget.files?.[0];
							if (!file)
								return;
							const text = await file.text();
							try {
								const data = JSON.parse(text);
								if (isTaskResult(data))
									state.data = data;
							}
							catch { }
						}}
					/>
				</Button>
			</Stack>
		</Match>
		<Match when={state.data!.taskName == "area-click"}>
			<AreaClickAnalysis data={state.data as AreaClickResult} />
		</Match>
	</Switch>;
};

export default Analysis;