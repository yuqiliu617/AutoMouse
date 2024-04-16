export type { MouseMotionRecord, TaskEvent, TaskResult, TaskPageProps } from "./TaskPage";
export type { AreaClickConfig, AreaClickEvent, AreaClickResult } from "./AreaClick";
export type { TrajectoryFollowConfig, TrajectoryFollowEvent, TrajectoryFollowResult } from "./TrajectoryFollow";

export { isTaskResult, isMouseMotionRecord } from "./TaskPage";
export { isAreaClickResult } from "./AreaClick";
export { isTrajectoryFollowResult } from "./TrajectoryFollow";