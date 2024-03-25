import { createElementSize } from "@solid-primitives/resize-observer";
import Konva from "konva";
import { Layer as KLayer, LayerConfig } from "konva/lib/Layer";
import { ShapeConfig } from "konva/lib/Shape";
import { Stage as KStage, StageConfig } from "konva/lib/Stage";
import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
	useContext,
	type Component,
	type ParentComponent
} from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

export type KonvaEvents = Partial<Record<
	// Mouse events
	"onMouseOver" | "onMouseOut" | "onMouseEnter" | "onMouseLeave" | "onMouseMove" | "onMouseDown" | "onMouseUp" | "onWheel" | "onClick" | "onDblClick" | "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTap" | "onDblTap" |
	// Touch events
	"onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onPointerOver" | "onPointerEnter" | "onPointerOut" | "onPointerLeave" | "onPointerClick" | "onPointerDblClick" |
	// Drag events
	"onDragStart" | "onDragMove" | "onDragEnd",
	(e: Konva.KonvaEventObject<Konva.Shape>) => void
>>;

export type TransformerEvents = Partial<Record<
	"onTransformStart" | "onTransform" | "onTransformEnd",
	(e: Konva.KonvaEventObject<Konva.Shape>) => void
>>;

function createStage(props: Omit<StageConfig, "container">) {
	const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
	const size = createElementSize(containerRef);
	const [stage, setStage] = createSignal<KStage>();

	onMount(() => setStage(
		new Konva.Stage({
			height: size.width!,
			width: size.height!,
			container: containerRef()!,
			...props,
		})
	));

	createEffect(() => stage()?.setAttrs({
		width: size.width,
		height: size.height,
	}));

	onCleanup(() => stage()?.destroy());

	return {
		...props,
		ref: setContainerRef,
		containerRef,
		stage,
	};
}

const StageContext = createContext<ReturnType<typeof createStage>>();
export const StageContextProvider: ParentComponent<{ stageProps: ReturnType<typeof createStage> }> = props =>
	<StageContext.Provider value={props.stageProps}>
		{props.children}
	</StageContext.Provider>;

export const useStage = () => useContext(StageContext);
export const Stage: Component<JSX.HTMLAttributes<HTMLDivElement> & Omit<StageConfig, "container">> = props => {
	const stageProps = createStage({ ...props });
	return <div ref={stageProps.ref} {...props}>
		<StageContextProvider stageProps={stageProps}>
			{props.children}
		</StageContextProvider>
	</div>;
}

const LayerContext = createContext<{ layer: KLayer }>();
const useLayer = () => useContext(LayerContext);
export const Layer: ParentComponent<LayerConfig> = props => {
	const layer = new Konva.Layer(props);
	const stage = useStage();

	createEffect(() => stage?.stage()?.add(layer));
	createEffect(() => layer.setAttrs(props));

	onCleanup(() => layer.destroy());

	return (
		// idk why, but this div fixes using <Show>
		<div>
			<LayerContext.Provider value={{ layer }}>
				{props.children}
			</LayerContext.Provider>
		</div>
	);
}

const propsToSkip: Record<string, boolean> = {
	children: true,
	ref: true,
	key: true,
	style: true,
	forwardedRef: true,
	unstable_applyCache: true,
	unstable_applyDrawHitFromCache: true,
};

type KonvaShape = "Group" | "Rect" | "Circle" | "Ellipse" | "Wedge" | "Line" | "Sprite" | "Image" | "Text" | "TextPath" | "Star" | "Ring" | "Arc" | "Tag" | "Path" | "RegularPolygon" | "Arrow" | "Shape" | "Transformer";

function createEntity<T extends object = {}>(shapeName: KonvaShape) {
	const Entity: Component<ShapeConfig & KonvaEvents & T> = props => {
		let prevProps: undefined | typeof props = undefined;
		const [entity, setEntity] = createSignal<Konva.Shape>();
		const layer = useLayer();

		onMount(() => {
			const entity = new (Konva as any)[shapeName](props) as Konva.Shape;
			setEntity(entity);
			layer?.layer?.add(entity);
		});

		createEffect(() => entity()?.setAttrs(props));
		createEffect(() => {
			if (!entity())
				return;
			if (prevProps) {
				for (const key in prevProps) {
					if (propsToSkip[key])
						continue;
					if (key.startsWith("on") && prevProps[key] !== props[key]) {
						let eventName = key.substring(2).toLowerCase();
						if (eventName.substring(0, 7) === "content")
							eventName = `content${eventName.at(7)!.toUpperCase()}${eventName.substring(8)}`;
						entity()!.off(eventName, prevProps[key]);
					}
					if (!props.hasOwnProperty(key))
						entity()!.setAttr(key, undefined);
				}
			}

			const newEvents = new Map<string, any>();
			for (const key in props) {
				if (propsToSkip[key])
					continue;
				if (key.startsWith("on") && prevProps?.[key] !== props[key]) {
					let eventName = key.substring(2).toLowerCase();
					if (eventName.substring(0, 7) === "content")
						eventName = `content${eventName.at(7)!.toUpperCase()}${eventName.substring(8)}`;
					// check that event is not undefined
					if (props[key])
						newEvents.set(eventName, props[key]);
				}
			}
			newEvents.forEach((value, key) => entity()!.on(key, value));
			prevProps = props;
		});

		onCleanup(() => entity()?.destroy());
		return <>{/* shape */}</>;
	}
	return Entity;
}

export const Group = createEntity("Group");
export const Rect = createEntity("Rect");
export const Circle = createEntity("Circle");
export const Ellipse = createEntity("Ellipse");
export const Wedge = createEntity("Wedge");
export const Line = createEntity("Line");
export const Sprite = createEntity("Sprite");
export const Image = createEntity("Image");
export const Text = createEntity("Text");
export const TextPath = createEntity("TextPath");
export const Star = createEntity("Star");
export const Ring = createEntity("Ring");
export const Arc = createEntity("Arc");
export const Tag = createEntity("Tag");
export const Path = createEntity("Path");
export const RegularPolygon = createEntity("RegularPolygon");
export const Arrow = createEntity("Arrow");
export const Shape = createEntity("Shape");
export const Transformer = createEntity<TransformerEvents>("Transformer");