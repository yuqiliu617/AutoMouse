import { createSignal, For, type ParentComponent } from "solid-js";

import AdbIcon from "@suid/icons-material/Adb";
import MenuIcon from "@suid/icons-material/Menu";
import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import Button from "@suid/material/Button";
import Container from "@suid/material/Container";
import CssBaseline from "@suid/material/CssBaseline";
import IconButton from "@suid/material/IconButton";
import Link from "@suid/material/Link";
import Menu from "@suid/material/Menu";
import MenuItem from "@suid/material/MenuItem";
import { createTheme, ThemeProvider } from "@suid/material/styles";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";

import routes from "./Routes";

const darkTheme = createTheme({
	palette: {
		mode: "dark"
	}
});

const menus = routes
	.filter(r => r.menu != undefined)
	.map(r => ({
		title: r.menu!,
		path: Array.isArray(r.path) ? r.path[0] : r.path
	}));

const App: ParentComponent = ({ children }) => {
	const [anchorElNav, setAnchorElNav] = createSignal<HTMLElement>();

	return <ThemeProvider theme={darkTheme}>
		<CssBaseline />
		<AppBar position="static">
			<Container maxWidth="xl">
				<Toolbar disableGutters>
					<AdbIcon sx={{
						display: {
							xs: "none",
							md: "flex"
						},
						mr: 1
					}} />
					<Typography
						variant="h6"
						noWrap
						component="a"
						href="#app-bar-with-responsive-menu"
						sx={{
							mr: 2,
							display: {
								xs: "none",
								md: "flex"
							},
							fontFamily: "monospace",
							fontWeight: 700,
							letterSpacing: ".3rem",
							color: "inherit",
							textDecoration: "none"
						}}
					>LOGO</Typography>
					<Box sx={{
						flexGrow: 1,
						display: {
							xs: "flex",
							md: "none"
						}
					}}>
						<IconButton
							size="large"
							aria-label="account of current user"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={event => setAnchorElNav(event.currentTarget)}
							color="inherit"
						>
							<MenuIcon />
						</IconButton>
						<Menu
							id="menu-appbar"
							anchorEl={anchorElNav()}
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "left"
							}}
							keepMounted
							transformOrigin={{
								vertical: "top",
								horizontal: "left"
							}}
							open={Boolean(anchorElNav())}
							onClose={() => setAnchorElNav(undefined)}
							sx={{
								display: {
									xs: "block",
									md: "none"
								}
							}}
						>
							<For each={menus}>{({ title, path }) =>
								<MenuItem onClick={() => setAnchorElNav(undefined)}>
									<Link href={path} underline="hover">
										<Typography textAlign="center">{title}</Typography>
									</Link>
								</MenuItem>
							}</For>
						</Menu>
					</Box>
					<AdbIcon sx={{
						display: {
							xs: "flex",
							md: "none"
						},
						mr: 1
					}} />
					<Typography
						variant="h5"
						noWrap
						component="a"
						href="#app-bar-with-responsive-menu"
						sx={{
							mr: 2,
							display: {
								xs: "flex",
								md: "none"
							},
							flexGrow: 1,
							fontFamily: "monospace",
							fontWeight: 700,
							letterSpacing: ".3rem",
							color: "inherit",
							textDecoration: "none"
						}}
					>
						LOGO
					</Typography>
					<Box sx={{
						flexGrow: 1,
						display: {
							xs: "none",
							md: "flex"
						}
					}}>
						<For each={menus}>{({ title, path }) =>
							<Button
								onClick={() => setAnchorElNav(undefined)}
								sx={{
									my: 2,
									color: "white",
									display: "block"
								}}
							>
								<Link href={path} underline="hover">{title}</Link>
							</Button>
						}</For>
					</Box>
				</Toolbar>
			</Container>
		</AppBar>
		{children}
	</ThemeProvider>;
};

export default App;