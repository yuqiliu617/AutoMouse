import { defineConfig } from "vite";
import suidPlugin from "@suid/vite-plugin";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	plugins: [suidPlugin(), solidPlugin()],
	root: "src",
	publicDir: "../public",
	build: {
		target: "esnext",
		outDir: "../dist"
	}
});
