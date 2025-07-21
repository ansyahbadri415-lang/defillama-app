export type { IChartProps } from '../ECharts/types'
export type { IBarChartProps } from '../ECharts/types'
export type { IPieChartProps } from '../ECharts/types'
export type { ILineAndBarChartProps } from '../ECharts/types'
export type { IMultiSeriesChartProps } from '../ECharts/types'

export interface ChartDTO {
	data: Record<string, any>[]
	config: ChartConfig
}

export interface ChartConfig {
	chartId: string
	chartType:
		| 'line'
		| 'area'
		| 'stacked-area'
		| 'bar'
		| 'stacked-bar'
		| 'clustered-bar'
		| 'multi-axis'
		| 'pie'
		| 'scatter'
		| 'table'
		| 'comparison'
		| 'mixed'
		| 'none'
	title: string
	description: string
	xAxis: {
		dataColumn: string
		label: string
	}
	yAxes?: YAxisConfig[]
	yAxis?: YAxisConfig
	defaultView?: string
	availableViews?: ViewConfig[]
	tooltip?: TooltipConfig
}

export interface YAxisConfig {
	axisId?: string
	dataColumn: string
	label: string
	unit: '$' | '%' | 'count' | 'ratio' | 'none'
	chartType?: 'line' | 'bar'
	scale?: 'value' | 'log'
	stacking?: 'normal' | 'percent' | null
}

export interface ViewConfig {
	viewId: string
	yAxis: YAxisConfig
}

export interface TooltipConfig {
	trigger: 'item' | 'axis'
	formatterTemplate?: string
	valueFormatterType?: 'currency' | 'percent' | 'abbreviate' | 'none'
}
