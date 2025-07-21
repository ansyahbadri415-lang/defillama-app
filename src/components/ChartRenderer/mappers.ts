import { IChartProps, IBarChartProps, IPieChartProps, ILineAndBarChartProps } from './types'
import { ChartDTO } from './types'
import { formattedNum } from '../../utils'

const calculatePercentageChange = (data: Record<string, any>[], yAxisColumn: string): Record<string, any>[] => {
	if (data.length === 0) return data

	let previousValue = data[0][yAxisColumn] || 0

	return data.map((row, index) => {
		const currentValue = row[yAxisColumn] || 0

		if (index === 0) {
			return { ...row, [yAxisColumn]: 0 }
		}

		const percentageChange = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
		previousValue = currentValue

		return { ...row, [yAxisColumn]: percentageChange }
	})
}

const calculateRatio = (
	data: Record<string, any>[],
	numeratorColumn: string,
	denominatorColumn: string
): Record<string, any>[] => {
	return data.map((row) => {
		const numerator = row[numeratorColumn] || 0
		const denominator = row[denominatorColumn] || 1
		const ratio = denominator !== 0 ? numerator / denominator : 0

		return { ...row, [`${numeratorColumn}_ratio`]: ratio }
	})
}

const applyViewTransformation = (
	data: Record<string, any>[],
	dto: ChartDTO,
	activeView?: string
): { data: Record<string, any>[]; valueSymbol: string; yAxisConfig: any } => {
	if (!activeView || !dto.config.availableViews) {
		const yAxis = dto.config.yAxis || dto.config.yAxes?.[0]
		return {
			data,
			valueSymbol: yAxis?.unit || '$',
			yAxisConfig: yAxis
		}
	}

	const viewConfig = dto.config.availableViews.find((v) => v.viewId === activeView)
	if (!viewConfig) {
		const yAxis = dto.config.yAxis || dto.config.yAxes?.[0]
		return {
			data,
			valueSymbol: yAxis?.unit || '$',
			yAxisConfig: yAxis
		}
	}

	let transformedData = [...data]

	if (viewConfig.yAxis.unit === '%' && viewConfig.viewId.includes('percentage')) {
		transformedData = calculatePercentageChange(transformedData, viewConfig.yAxis.dataColumn)
	}

	if (viewConfig.yAxis.unit === 'ratio' && viewConfig.viewId.includes('ratio')) {
		if (dto.config.yAxes && dto.config.yAxes.length >= 2) {
			transformedData = calculateRatio(transformedData, dto.config.yAxes[0].dataColumn, dto.config.yAxes[1].dataColumn)
		}
	}

	return {
		data: transformedData,
		valueSymbol: viewConfig.yAxis.unit || '$',
		yAxisConfig: viewConfig.yAxis
	}
}

export const mapToAreaChartProps = (dto: ChartDTO, activeView?: string): IChartProps => {
	if (!dto.config.yAxes && !dto.config.yAxis) throw new Error('Missing yAxis config')

	const yAxes = dto.config.yAxes || [dto.config.yAxis!]
	const isStacked = dto.config.chartType === 'stacked-area'
	const stacks = yAxes.map((axis) => axis.label)
	const stackColors = yAxes.reduce((acc, axis, i) => {
		const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
		acc[axis.label] = colors[i % colors.length]
		return acc
	}, {} as Record<string, string>)

	const { data: transformedData, valueSymbol, yAxisConfig } = applyViewTransformation(dto.data, dto, activeView)

	let chartData = transformedData.map((row) => ({
		date: Math.floor(new Date(row[dto.config.xAxis.dataColumn]).getTime() / 1000),
		...yAxes.reduce((acc, axis) => {
			acc[axis.label] = row[axis.dataColumn] || 0
			return acc
		}, {} as Record<string, number>)
	}))

	return {
		title: dto.config.title,
		chartData,
		stacks,
		stackColors,
		valueSymbol,
		isStackedChart: isStacked,
		height: '400px',
		hideDownloadButton: false,
		hideDataZoom: false,
		tooltipSort: true,
		chartOptions: {
			tooltip: {
				formatter: (params: any) => {
					if (Array.isArray(params)) {
						return params.map((p: any) => `${p.seriesName}: ${valueSymbol}${formattedNum(p.value[1])}`).join('<br/>')
					}
					return `${params.seriesName}: ${valueSymbol}${formattedNum(params.value[1])}`
				}
			},
			yAxis: {
				type: yAxisConfig?.scale || 'value'
			}
		}
	}
}

export const mapToBarChartProps = (dto: ChartDTO, activeView?: string): IBarChartProps => {
	if (!dto.config.yAxis && !dto.config.yAxes?.[0]) throw new Error('Missing yAxis config')

	const yAxis = dto.config.yAxis || dto.config.yAxes![0]
	const isStacked = dto.config.chartType === 'stacked-bar'

	const { data: transformedData, valueSymbol } = applyViewTransformation(dto.data, dto, activeView)

	const chartData = transformedData.map((row) => [row[dto.config.xAxis.dataColumn], row[yAxis.dataColumn] || 0])

	return {
		chartData,
		valueSymbol,
		title: dto.config.title,
		color: '#1f77b4',
		height: '400px',
		stacks: isStacked ? { [yAxis.label]: '#1f77b4' } : undefined
	}
}

export const mapToPieChartProps = (dto: ChartDTO, activeView?: string): IPieChartProps => {
	if (!dto.config.yAxis && !dto.config.yAxes?.[0]) throw new Error('Missing yAxis config')

	const yAxis = dto.config.yAxis || dto.config.yAxes![0]

	const { data: transformedData, valueSymbol } = applyViewTransformation(dto.data, dto, activeView)

	const chartData = transformedData.map((row) => ({
		name: row[dto.config.xAxis.dataColumn] || 'Unknown',
		value: row[yAxis.dataColumn] || 0
	}))

	const stackColors = chartData.reduce((acc, item, i) => {
		const colors = [
			'#1f77b4',
			'#ff7f0e',
			'#2ca02c',
			'#d62728',
			'#9467bd',
			'#8c564b',
			'#e377c2',
			'#7f7f7f',
			'#bcbd22',
			'#17becf'
		]
		acc[item.name] = colors[i % colors.length]
		return acc
	}, {} as Record<string, string>)

	return {
		title: dto.config.title,
		chartData,
		stackColors,
		usdFormat: valueSymbol === '$',
		height: '400px',
		showLegend: true
	}
}

export const mapToScatterChartProps = (dto: ChartDTO, activeView?: string): any => {
	if (!dto.config.yAxis && !dto.config.yAxes?.[0]) throw new Error('Missing yAxis config')

	const yAxis = dto.config.yAxis || dto.config.yAxes![0]

	const { data: transformedData, valueSymbol } = applyViewTransformation(dto.data, dto, activeView)

	const chartData = transformedData.map((row) => [row[dto.config.xAxis.dataColumn] || 0, row[yAxis.dataColumn] || 0])

	return {
		title: dto.config.title,
		chartData,
		valueSymbol,
		height: '400px'
	}
}

export const mapToMixedChartProps = (dto: ChartDTO, activeView?: string): ILineAndBarChartProps => {
	if (!dto.config.yAxes || dto.config.yAxes.length < 2) {
		throw new Error('Mixed charts require multiple yAxes')
	}

	const charts = dto.config.yAxes.reduce((acc, axis, index) => {
		const data = dto.data.map((row) => [
			Math.floor(new Date(row[dto.config.xAxis.dataColumn]).getTime() / 1000),
			row[axis.dataColumn] || 0
		])

		acc[axis.axisId || axis.label] = {
			data,
			type: axis.chartType || 'line',
			name: axis.label,
			stack: axis.stacking || '',
			color: ['#1f77b4', '#ff7f0e', '#2ca02c'][index % 3]
		}
		return acc
	}, {} as Record<string, any>)

	return {
		charts,
		height: '400px',
		valueSymbol: dto.config.yAxes[0].unit || '$',
		groupBy: dto.config.xAxis.dataColumn.includes('date') ? 'daily' : undefined
	}
}

export const mapToClusteredBarChartProps = (dto: ChartDTO, activeView?: string): any => {
	const yAxes = dto.config.yAxes || (dto.config.yAxis ? [dto.config.yAxis] : null)

	if (!yAxes || yAxes.length === 0) {
		throw new Error('ClusteredBarChart requires at least one yAxis configuration')
	}

	const { data: transformedData, valueSymbol } = applyViewTransformation(dto.data, dto, activeView)

	const chartData = transformedData.map((row) => ({
		category: row[dto.config.xAxis.dataColumn] || 'Unknown',
		...yAxes.reduce((acc, axis) => {
			acc[axis.label] = row[axis.dataColumn] || 0
			return acc
		}, {} as Record<string, number>)
	}))

	const stackColors = yAxes.reduce((acc, axis, index) => {
		const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
		acc[axis.label] = colors[index % colors.length]
		return acc
	}, {} as Record<string, string>)

	return {
		title: dto.config.title,
		chartData,
		clusters: yAxes.map((axis) => axis.label),
		stackColors,
		valueSymbol,
		height: '400px',
		groupBy: 'category'
	}
}
