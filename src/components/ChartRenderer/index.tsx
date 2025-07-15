import React, { useState, useMemo } from 'react'
import AreaChart from '../ECharts/AreaChart'
import CustomBarChart from './CustomBarChart'
import ClusteredBarChart from './ClusteredBarChart'
import ComparisonChart from './ComparisonChart'
import MixedChart from './MixedChart'

interface ChartDataFormat {
	single?: Array<{
		date: string
		[metric: string]: number | string
	}>

	multi?: {
		entities: string[]
		metrics: string[]
		series: Array<{
			entity: string
			metric: string
			data: Array<{
				date: string
				value: number
			}>
		}>
	}
}

export interface ChartConfig {
	id: string
	type: 'line' | 'bar' | 'pie' | 'scatter' | 'stacked-bar' | 'clustered-bar' | 'comparison' | 'mixed' | 'table'
	title?: string
	description?: string
	data: ChartDataFormat
	config: {
		xAxis: string
		yAxis: string
		series: SeriesConfig[]
		valueSymbol?: string
		isStacked?: boolean
		yAxisScale?: 'linear' | 'logarithmic'
	}
	availableViews?: Array<{
		mode: 'absolute' | 'percentage'
		metrics: string[]
		symbol: string
		title: string
	}>
	activeView?: 'absolute' | 'percentage'
	advancedConfig?: {
		clustered?: {
			groupBy: string
			groupLimit: number
			othersCategory: boolean
		}
		comparison?: {
			entities: string[]
			baseline?: 'category_average' | 'market_total' | 'previous_period'
			showDifference: boolean
			showPercentage: boolean
		}
		mixed?: {
			primaryAxis: string
			secondaryAxis: string
			dualYAxis: boolean
		}
	}
}

interface SeriesConfig {
	name: string
	dataKey: string
	entityKey: string
	type: 'line' | 'bar'
	color: string
}

interface ChartRendererProps {
	chart: ChartConfig
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
	const {
		type,
		title,
		description,
		data,
		config,
		advancedConfig,
		availableViews,
		activeView: defaultActiveView
	} = chart

	const [activeView, setActiveView] = useState<'absolute' | 'percentage'>(defaultActiveView || 'percentage')

	const currentViewConfig = useMemo(() => {
		if (!availableViews || availableViews.length === 0) {
			return null
		}

		return availableViews.find((view) => view.mode === activeView) || availableViews[0]
	}, [availableViews, activeView])

	const { filteredData, filteredConfig } = useMemo(() => {
		if (!currentViewConfig) {
			return { filteredData: data, filteredConfig: config }
		}

		const viewMetrics = currentViewConfig.metrics

		let newData = data

		if (type === 'clustered-bar' && (data as any).categories && (data as any).series) {
			const originalData = data as any
			const filteredSeries = originalData.series.filter((seriesItem: any) => viewMetrics.includes(seriesItem.dataKey))
			newData = {
				...originalData,
				series: filteredSeries
			}
		} else if (data.single) {
			newData = {
				single: data.single.map((item) => {
					const filtered: any = { date: item.date, entity: (item as any).entity }
					viewMetrics.forEach((metric) => {
						if (metric in item) {
							filtered[metric] = (item as any)[metric]
						}
					})
					return filtered
				})
			}
		} else if (data.multi) {
			const filteredSeries = data.multi.series.filter((seriesItem) => viewMetrics.includes(seriesItem.metric))

			const filteredMetrics = data.multi.metrics.filter((metric) => viewMetrics.includes(metric))
			newData = {
				multi: {
					...data.multi,
					metrics: filteredMetrics,
					series: filteredSeries
				}
			}
		}

		const newConfig = {
			...config,
			valueSymbol: currentViewConfig.symbol,
			yAxis: currentViewConfig.title.includes('%') ? 'Percentage Change' : config.yAxis
		}

		return { filteredData: newData, filteredConfig: newConfig }
	}, [data, config, currentViewConfig])

	const renderChart = () => {
		switch (type) {
			case 'line':
				const lineData = convertToAreaChartData(filteredData, filteredConfig)

				let stacks: string[] = []
				let stackColors: Record<string, string> = {}

				if (filteredData.multi) {
					stacks = filteredData.multi.entities
					stackColors = filteredData.multi.entities.reduce((acc, entity, index) => {
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
						acc[entity] = colors[index % colors.length]
						return acc
					}, {} as Record<string, string>)
				} else {
					stacks = filteredConfig.series?.map((s) => s.name) || []
					stackColors =
						filteredConfig.series?.reduce((acc, s) => {
							acc[s.name] = s.color
							return acc
						}, {} as Record<string, string>) || {}
				}

				const finalStacks = Array.isArray(lineData[0]) ? [] : stacks
				const finalStackColors = Array.isArray(lineData[0]) ? {} : stackColors

				return (
					<AreaChart
						title={title}
						chartData={lineData}
						stacks={finalStacks}
						stackColors={finalStackColors}
						valueSymbol={filteredConfig.valueSymbol || '$'}
						height="400px"
						hideDownloadButton={false}
						hideDataZoom={false}
						isStackedChart={filteredConfig.isStacked || false}
					/>
				)

			case 'bar':
			case 'stacked-bar':
				return (
					<CustomBarChart
						title={title}
						chartData={filteredData}
						config={filteredConfig}
						valueSymbol={filteredConfig.valueSymbol || '$'}
						height="400px"
						isStacked={filteredConfig.isStacked}
						chartType={type}
					/>
				)

			case 'clustered-bar':
				return (
					<ClusteredBarChart
						title={title}
						data={filteredData}
						config={filteredConfig}
						advancedConfig={advancedConfig?.clustered}
						valueSymbol={filteredConfig.valueSymbol || '$'}
						height="400px"
					/>
				)

			case 'comparison':
				return (
					<ComparisonChart
						title={title}
						data={filteredData}
						config={filteredConfig}
						advancedConfig={advancedConfig?.comparison}
						valueSymbol={filteredConfig.valueSymbol || '$'}
						height="400px"
					/>
				)

			case 'mixed':
				return (
					<MixedChart
						title={title}
						data={filteredData}
						config={filteredConfig}
						advancedConfig={advancedConfig?.mixed}
						valueSymbol={filteredConfig.valueSymbol || '$'}
						height="400px"
					/>
				)

			case 'pie':
				return renderPieChart()

			case 'scatter':
				return renderScatterChart()

			case 'table':
				return renderTable()

			default:
				return (
					<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
						<div className="text-center">
							<p className="text-gray-500 mb-2">Chart type "{type}" not yet supported</p>
							<details className="text-xs">
								<summary className="cursor-pointer">View raw data</summary>
								<pre className="mt-2 text-left bg-gray-50 dark:bg-gray-800 p-2 rounded">
									{JSON.stringify({ data, config }, null, 2)}
								</pre>
							</details>
						</div>
					</div>
				)
		}
	}

	const convertToAreaChartData = (chartData: ChartDataFormat, chartConfig: any) => {
		if (chartData.single && Array.isArray(chartData.single)) {
			if (chartData.single.length === 0) return []

			if (!chartConfig.series || chartConfig.series.length <= 1) {
				const dataKey =
					chartConfig.series?.[0]?.dataKey || Object.keys(chartData.single[0]).find((k) => k !== 'date') || 'value'

				return chartData.single.map((item) => {
					const timestamp = Math.floor(new Date(item.date).getTime() / 1000)
					const value = (item as any)[dataKey] || 0
					return [timestamp, value]
				})
			}

			return chartData.single.map((item) => ({
				date: Math.floor(new Date(item.date).getTime() / 1000),
				...chartConfig.series.reduce((acc: any, series: any) => {
					acc[series.name] = (item as any)[series.dataKey] || 0
					return acc
				}, {})
			}))
		}

		if (chartData.multi) {
			const { entities, series } = chartData.multi

			const dateMap = new Map<string, any>()

			series.forEach(({ entity, data: seriesData }) => {
				seriesData.forEach(({ date, value }) => {
					if (!dateMap.has(date)) {
						dateMap.set(date, { date })
					}
					const dateEntry = dateMap.get(date)!

					dateEntry[entity] = value
				})
			})

			return Array.from(dateMap.values())
				.sort((a, b) => a.date.localeCompare(b.date))
				.map((item) => ({
					date: Math.floor(new Date(item.date).getTime() / 1000),
					...entities.reduce((acc: any, entity) => {
						acc[entity] = item[entity] || 0
						return acc
					}, {})
				}))
		}

		return []
	}

	const renderPieChart = () => (
		<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
			<p className="text-gray-500">Pie chart rendering coming soon</p>
		</div>
	)

	const renderScatterChart = () => (
		<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
			<p className="text-gray-500">Scatter plot rendering coming soon</p>
		</div>
	)

	const renderTable = () => {
		let tableData: any[] = []

		if (data.single && Array.isArray(data.single)) {
			tableData = data.single
		} else if (data.multi) {
			const { series } = data.multi
			const dateMap = new Map<string, any>()

			series.forEach(({ entity, metric, data: seriesData }) => {
				seriesData.forEach(({ date, value }) => {
					const key = `${date}_${entity}`
					if (!dateMap.has(key)) {
						dateMap.set(key, { date, entity })
					}
					const row = dateMap.get(key)!
					row[metric] = value
				})
			})

			tableData = Array.from(dateMap.values()).sort((a, b) => {
				const dateCompare = a.date.localeCompare(b.date)
				return dateCompare !== 0 ? dateCompare : a.entity.localeCompare(b.entity)
			})
		}

		if (tableData.length === 0) {
			return <div className="text-center p-4">No data available</div>
		}

		const headers = Object.keys(tableData[0])

		return (
			<div className="overflow-auto">
				<table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
					<thead>
						<tr className="bg-gray-100 dark:bg-gray-800">
							{headers.map((key) => (
								<th key={key} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left">
									{key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{tableData.map((row, index) => (
							<tr key={index} className="border-b">
								{headers.map((header) => (
									<td key={header} className="border border-gray-300 dark:border-gray-600 px-3 py-2">
										{typeof row[header] === 'number' ? row[header].toLocaleString() : String(row[header] || '')}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	return (
		<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
			{title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
			{description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}

			{}
			{availableViews && availableViews.length > 1 && (
				<div className="flex items-center gap-2 mb-4">
					<span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
					<div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
						{availableViews.map((view) => (
							<button
								key={view.mode}
								onClick={() => setActiveView(view.mode)}
								className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
									activeView === view.mode
										? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
										: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
								}`}
							>
								{view.symbol} {view.mode === 'absolute' ? 'Values' : 'Change'}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="min-h-[400px]">{renderChart()}</div>
		</div>
	)
}

export default ChartRenderer
