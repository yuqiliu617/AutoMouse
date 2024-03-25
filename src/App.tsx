import { For, type ParentComponent } from "solid-js";

import AdbIcon from "@suid/icons-material/Adb";
import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import Button from "@suid/material/Button";
import Container from "@suid/material/Container";
import CssBaseline from "@suid/material/CssBaseline";
import Link from "@suid/material/Link";
import { createTheme, ThemeProvider } from "@suid/material/styles";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";

import routes from "./Routes";

const menus = routes
	.filter(r => r.menu != undefined)
	.map(r => ({
		title: r.menu!,
		path: Array.isArray(r.path) ? r.path[0] : r.path
	}));

const theme = createTheme({
	palette: {
		mode: "dark"
	}
});

const App: ParentComponent = props => <ThemeProvider theme={theme}>
	<CssBaseline />
	<AppBar position="static">
		<Container maxWidth="xl">
			<Toolbar disableGutters>
				<AdbIcon sx={{ display: "flex", mr: 1 }} />
				<Typography
					variant="h6"
					noWrap
					component="a"
					href="#app-bar-with-responsive-menu"
					sx={{
						mr: 2,
						display: "flex",
						fontFamily: "monospace",
						fontWeight: 700,
						letterSpacing: ".3rem",
						color: "inherit",
						textDecoration: "none"
					}}
				>LOGO</Typography>
				<Box sx={{ flexGrow: 1, display: "flex" }}>
					<For each={menus}>{({ title, path }) =>
						<Button sx={{ mr: 2, color: "white", display: "block" }}>
							<Link href={path} underline="hover">{title}</Link>
						</Button>
					}</For>
				</Box>
			</Toolbar>
		</Container>
	</AppBar>
	{props.children}
</ThemeProvider>;

export default App;