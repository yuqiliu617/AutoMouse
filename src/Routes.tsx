import { type RouteDefinition } from "@solidjs/router";
import { lazy } from "solid-js";

const routes: (RouteDefinition<string | string[]> & { menu?: string })[] = [
	{
		menu: "Record",
		path: ["/record", "/"],
		component: lazy(() => import("./pages/Record"))
	},
	{
		menu: "Settings",
		path: "/settings",
		component: lazy(() => import("./pages/Settings"))
	},
	{
		menu: "About",
		path: "/about",
		component: lazy(() => import("./pages/About"))
	}
];

export default routes;