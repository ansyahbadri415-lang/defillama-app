import React, { useState, useMemo, useCallback } from 'react'
import { ChartDTO } from './types'
import ChartNavigation from './ChartNavigation'
import DataTable from './DataTable'
import AreaChart from '../ECharts/AreaChart'
import CustomBarChart from '../ECharts/BarChart'
import ClusteredBarChart from '../ECharts/BarChart/ClusteredBarChart'
import PieChart from '../ECharts/PieChart'
import ScatterChart from '../ECharts/ScatterChart'
import LineAndBarChart from '../ECharts/LineAndBarChart'
import {
	mapToAreaChartProps,
	mapToBarChartProps,
	mapToPieChartProps,
	mapToScatterChartProps,
	mapToMixedChartProps,
	mapToClusteredBarChartProps
} from './mappers'

interface ChartRendererProps {
	charts: ChartDTO[]
}

const ChartRenderer = React.memo<ChartRendererProps>(({ charts }) => {
	if (charts.length === 0) return <div>No data available</div>
	if (charts.length > 1) return <ChartNavigation charts={charts} />

	const dto = charts[0]

	if (dto.config.chartType === 'none') return null

	const [activeView, setActiveView] = useState(dto.config.defaultView || 'absolute')

	const dataSize = dto.data.length
	const showPerformanceWarning = dataSize > 1000

	const chartProps = useMemo(() => {
		try {
			switch (dto.config.chartType) {
				case 'line':
				case 'area':
				case 'stacked-area':
					return { type: 'area', props: mapToAreaChartProps(dto, activeView) }

				case 'bar':
				case 'stacked-bar':
					return { type: 'bar', props: mapToBarChartProps(dto, activeView) }

				case 'pie':
					return { type: 'pie', props: mapToPieChartProps(dto, activeView) }

				case 'scatter':
					return { type: 'scatter', props: mapToScatterChartProps(dto, activeView) }

				case 'multi-axis':
				case 'mixed':
					return { type: 'mixed', props: mapToMixedChartProps(dto, activeView) }

				case 'clustered-bar':
					return { type: 'clustered', props: mapToClusteredBarChartProps(dto, activeView) }

				case 'table':
					return { type: 'table', props: null }

				case 'comparison':
					const underlyingType = dto.config.yAxes?.length > 1 ? 'mixed' : 'bar'
					if (underlyingType === 'mixed') {
						return { type: 'mixed', props: mapToMixedChartProps(dto, activeView) }
					} else {
						return { type: 'bar', props: mapToBarChartProps(dto, activeView) }
					}

				default:
					return { type: 'unsupported', props: null }
			}
		} catch (error) {
			return { type: 'error', props: null, error }
		}
	}, [dto, activeView])

	const handleViewChange = useCallback((viewId: string) => {
		setActiveView(viewId)
	}, [])

	const renderViewToggle = () => {
		if (!dto.config.availableViews || dto.config.availableViews.length <= 1) return null

		if (dto.config.chartType === 'clustered-bar') {
			const totalAxes = (dto.config.yAxes?.length || 0) + (dto.config.yAxis ? 1 : 0)
			if (totalAxes <= 1) return null
		}

		return (
			<div className="flex items-center gap-2 mb-4">
				<span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
				<div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
					{dto.config.availableViews.map((view) => {
						if (!view.yAxis) {
							console.warn('ChartRenderer: ViewConfig missing yAxis property', view)
							return (
								<button
									key={view.viewId}
									onClick={() => handleViewChange(view.viewId)}
									className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
										activeView === view.viewId
											? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
											: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
									}`}
								>
									{view.viewId}
								</button>
							)
						}

						const unit = view.yAxis.unit || ''
						const label = view.yAxis.label || view.viewId || 'View'
						const displayText = unit ? `${unit} ${label}` : label

						return (
							<button
								key={view.viewId}
								onClick={() => handleViewChange(view.viewId)}
								className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
									activeView === view.viewId
										? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
										: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
								}`}
							>
								{displayText}
							</button>
						)
					})}
				</div>
			</div>
		)
	}

	const renderChart = () => {
		if (showPerformanceWarning) {
			return (
				<div>
					<div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
						<div className="text-yellow-700 dark:text-yellow-300 text-sm">
							⚠️ Large dataset ({dataSize} points). Chart may render slowly.
						</div>
					</div>
					{renderActualChart()}
				</div>
			)
		}
		return renderActualChart()
	}

	const renderActualChart = () => {
		if (chartProps.type === 'error') {
			return (
				<div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900 rounded border border-red-200 dark:border-red-700">
					<div className="text-center text-red-600 dark:text-red-400">
						<p className="mb-2">Error rendering chart</p>
						<p className="text-sm">{chartProps.error instanceof Error ? chartProps.error.message : 'Unknown error'}</p>
					</div>
				</div>
			)
		}

		switch (chartProps.type) {
			case 'area':
				return <AreaChart {...chartProps.props} />
			case 'bar':
				return <CustomBarChart {...chartProps.props} />
			case 'pie':
				return <PieChart {...chartProps.props} />
			case 'scatter':
				return <ScatterChart {...chartProps.props} />
			case 'mixed':
				return <LineAndBarChart {...chartProps.props} />
			case 'clustered':
				return <ClusteredBarChart {...chartProps.props} />
			case 'table':
				return <DataTable dto={dto} />
			case 'unsupported':
			default:
				return (
					<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
						<div className="text-center">
							<p className="text-gray-500 mb-2">Chart type "{dto.config.chartType}" not supported</p>
							<details className="text-xs">
								<summary className="cursor-pointer">View raw data</summary>
								<pre className="mt-2 text-left bg-gray-50 dark:bg-gray-800 p-2 rounded">
									{JSON.stringify(dto.data.slice(0, 5), null, 2)}
								</pre>
							</details>
						</div>
					</div>
				)
		}
	}

	return (
		<div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
			{dto.config.title && (
				<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{dto.config.title}</h3>
			)}
			{dto.config.description && (
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{dto.config.description}</p>
			)}

			{renderViewToggle()}

			<div className="min-h-[400px]">{renderChart()}</div>
		</div>
	)
})

export default ChartRenderer
