import type { ChartOptions } from "chart.js";


export const colors = {
	red: "rgba(255, 99, 132, 0.3)",
	gold: "rgba(255, 206, 86, 0.3)",
	green: "rgba(75, 192, 192, 0.3)",
	blue: "rgba(54, 162, 235, 0.3)",
	axis: "rgba(255, 255, 255, 0.3)",
	annotation: "rgba(255, 99, 132, 0.5)"
};
export const chartOptions: ChartOptions = {
	scales: {
		x: {
			type: "linear",
			position: "bottom",
			ticks: {
				color: colors.axis
			},
			grid: {
				color: colors.axis
			}
		},
		y: {
			type: "linear",
			position: "left",
			ticks: {
				color: colors.axis
			},
			grid: {
				color: colors.axis
			}
		}
	}
};