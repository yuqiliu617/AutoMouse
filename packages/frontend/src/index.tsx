import { Router } from "@solidjs/router";
import { render } from "solid-js/web";

import App from "./App";
import routes from "./Routes";

render(() => <Router root={App}>{routes}</Router>, document.getElementById("root")!);
