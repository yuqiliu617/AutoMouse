import { createElementSize } from "@solid-primitives/resize-observer";
import Konva from "konva";
import type { StageConfig } from "konva/lib/Stage";
import type { LayerConfig } from "konva/lib/Layer";
import type { Shape as ShapeType } from "konva/lib/Shape";
import type { GroupConfig } from "konva/lib/Group";
import type { TransformerConfig } from "konva/lib/shapes/Transformer";
import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
	splitProps,
	useContext,
	type Component,
	type ParentComponent,
	type VoidComponent
} from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

export type KonvaEvents<T extends Konva.Node = Konva.Shape> = Partial<Record<
	// Mouse events
	"onMouseOver" | "onMouseOut" | "onMouseEnter" | "onMouseLeave" | "onMouseMove" | "onMouseDown" | "onMouseUp" | "onWheel" | "onClick" | "onDblClick" | "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTap" | "onDblTap" |
	// Touch events
	"onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onPointerOver" | "onPointerEnter" | "onPointerOut" | "onPointerLeave" | "onPointerClick" | "onPointerDblClick" |
	// Drag events
	"onDragStart" | "onDragMove" | "onDragEnd",
	(e: Konva.KonvaEventObject<T>) => void
>>;

export type TransformerEvents = Partial<Record<
	"onTransformStart" | "onTransform" | "onTransformEnd",
	(e: Konva.KonvaEventObject<Konva.Transformer>) => void
>>;

const StageContext = createContext<{ stage?: Konva.Stage }>();
export const useStage = () => useContext(StageContext);
export type StageProps = Omit<StageConfig, "container"> & {
	autoSize?: boolean;
	containerProps?: JSX.HTMLAttributes<HTMLDivElement>;
};

export const Stage: ParentComponent<StageProps> = props => {
	const [divProps, stageProps] = splitProps(props, ["containerProps"]);
	const [container, setContainer] = createSignal<HTMLDivElement>();
	const [stage, setStage] = createSignal<Konva.Stage>();
	const size = props.autoSize
		? createElementSize(container)
		: { width: stageProps.width, height: stageProps.height };

	onMount(() => {
		const stage = new Konva.Stage({
			height: size.width!,
			width: size.height!,
			container: container()!,
			...stageProps,
		});
		setStage(stage);
	});

	if (props.autoSize)
		createEffect(() => stage()?.setAttrs({
			width: size.width,
			height: size.height,
		}));

	onCleanup(() => stage()?.destroy());

	const context: { stage?: Konva.Stage } = {};
	Object.defineProperty(context, "stage", { get: stage, set: setStage });
	return <div ref={setContainer} {...divProps.containerProps}>
		<StageContext.Provider value={context}>
			{props.children}
		</StageContext.Provider>
	</div>;
}

const LayerContext = createContext<{ layer: Konva.Layer }>();
export const useLayer = () => useContext(LayerContext);
export const Layer: ParentComponent<LayerConfig> = props => {
	const layer = new Konva.Layer(props);
	const stageContext = useStage();

	createEffect(() => stageContext?.stage?.add(layer));
	createEffect(() => layer.setAttrs(props));

	onCleanup(() => layer.destroy());

	return <LayerContext.Provider value={{ layer }}>
		{props.children}
	</LayerContext.Provider>;
}

const GroupContext = createContext<{ group: Konva.Group }>();
export const useGroup = () => useContext(GroupContext);

const propsToSkip = ["children", "ref", "key", "style", "forwardedRef"];
function getEventName(key: string) {
	const name = key.substring(2).toLowerCase();
	return name.substring(0, 7) === "content" ? `content${name.at(7)!.toUpperCase()}${name.substring(8)}` : name;
}
type ConfigType<T extends Konva.Node> = T extends ShapeType<infer U> ? U : T extends Konva.Transformer ? TransformerConfig : T extends Konva.Group ? GroupConfig : never;
type EventsType<T extends Konva.Node> = KonvaEvents<T> & (T extends Konva.Transformer ? TransformerEvents : {});
function createEntity<T extends Konva.Shape | Konva.Container>(Shape: { new(config: ConfigType<T>): T }):
	T extends Konva.Container ? ParentComponent<ConfigType<T> & EventsType<T>> : VoidComponent<ConfigType<T> & EventsType<T>> {
	const Entity: Component<ConfigType<T> & EventsType<T>> = props => {
		let prevProps: undefined | typeof props = undefined;
		const [entity, setEntity] = createSignal<T>();
		const groupContext = useGroup();
		const layerContext = useLayer();

		onMount(() => {
			const entity = new Shape(props) as Konva.Group | ShapeType;
			setEntity(entity as any);
			if (groupContext)
				groupContext.group.add(entity);
			else if (layerContext)
				layerContext.layer.add(entity);
		});

		createEffect(() => entity()?.setAttrs(props));
		createEffect(() => {
			if (!entity())
				return;
			if (prevProps) {
				for (const key in prevProps) {
					if (propsToSkip.includes(key) || key.startsWith("unstable_"))
						continue;
					if (key.startsWith("on") && prevProps[key] !== props[key]) {
						const eventName = getEventName(key);
						entity()!.off(eventName, prevProps[key]);
					}
					if (!props.hasOwnProperty(key))
						entity()!.setAttr(key, undefined);
				}
			}
			const newEvents = new Map<string, any>();
			for (const key in props) {
				if (propsToSkip.includes(key) || key.startsWith("unstable_"))
					continue;
				if (key.startsWith("on") && prevProps?.[key] !== props[key]) {
					const eventName = getEventName(key);
					if (props[key])
						newEvents.set(eventName, props[key]);
				}
			}
			newEvents.forEach((value, key) => entity()!.on(key, value));
			prevProps = props;
		});

		onCleanup(() => entity()?.destroy());

		const group = entity();
		return group instanceof Konva.Group
			? <GroupContext.Provider value={{ group }}>
				{props.children}
			</GroupContext.Provider>
			: <>{/* shape */}</>;
	}
	return Entity as any;
}

export const Shape = createEntity(Konva.Shape);
export const Rect = createEntity(Konva.Rect);
export const Circle = createEntity(Konva.Circle);
export const Ellipse = createEntity(Konva.Ellipse);
export const Wedge = createEntity(Konva.Wedge);
export const Line = createEntity(Konva.Line);
export const Sprite = createEntity(Konva.Sprite);
export const Image = createEntity(Konva.Image);
export const Text = createEntity(Konva.Text);
export const TextPath = createEntity(Konva.TextPath);
export const Star = createEntity(Konva.Star);
export const Ring = createEntity(Konva.Ring);
export const Arc = createEntity(Konva.Arc);
export const Label = createEntity(Konva.Label);
export const Tag = createEntity(Konva.Tag);
export const Path = createEntity(Konva.Path);
export const RegularPolygon = createEntity(Konva.RegularPolygon);
export const Arrow = createEntity(Konva.Arrow);
export const Group = createEntity(Konva.Group);
export const Transformer = createEntity(Konva.Transformer);