import { useEffect, useId, useMemo, useState, useRef } from 'react'
import * as echarts from 'echarts/core'
import { stringToColour } from '../utils'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download, slug, formatUsdWithSign } from '~/utils'

interface ClusteredBarChartProps {
	chartData: Array<{
		category: string
		[key: string]: string | number
	}>
	clusters: string[] // Array of column names to cluster
	valueSymbol?: string
	title?: string
	color?: string
	chartOptions?: any
	height?: string
	stackColors?: Record<string, string>
	groupBy?: string
	hideDefaultLegend?: boolean
	customLegendName?: string
	customLegendOptions?: string[]
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	containerClassName?: string
}

export default function ClusteredBarChart({
	chartData,
	clusters,
	valueSymbol = '',
	title,
	color,
	chartOptions,
	height,
	stackColors,
	groupBy = 'category',
	hideDefaultLegend = false,
	customLegendName,
	customLegendOptions,
	hideDataZoom = false,
	hideDownloadButton = false,
	containerClassName
}: ClusteredBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()

	const [legendOptions, setLegendOptions] = useState(customLegendOptions ? [...customLegendOptions] : [])

	const { selectedClusters } = useMemo(() => {
		const selectedClusters =
			customLegendOptions && customLegendName ? clusters.filter((cluster) => legendOptions.includes(cluster)) : clusters
		return { selectedClusters }
	}, [clusters, customLegendOptions, customLegendName, legendOptions])

	const hideLegend = hideDefaultLegend || clusters.length < 2 || selectedClusters.length < 2

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		hideLegend,
		isThemeDark,
		groupBy: 'daily'
	})

	// Transform data for clustered bars with dual Y-axis support
	const { categories, series } = useMemo(() => {
		if (!chartData || chartData.length === 0) {
			return { categories: [], series: [] }
		}

		// Extract unique categories
		const categories = [...new Set(chartData.map((item) => item[groupBy] as string))]

		// Create series for each cluster with dynamic multi-axis support
		const series = selectedClusters.map((cluster, index) => {
			const data = categories.map((category) => {
				const item = chartData.find((d) => d[groupBy] === category)
				return item ? (item[cluster] as number) || 0 : 0
			})

			const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
			const clusterColor = stackColors?.[cluster] || colors[index % colors.length]

			return {
				name: cluster,
				type: 'bar',
				data: data,
				yAxisIndex: index, // Each cluster gets its own Y-axis
				large: true,
				largeThreshold: 0,
				itemStyle: {
					color: clusterColor
				},
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				}
			}
		})

		return { categories, series }
	}, [chartData, selectedClusters, groupBy, stackColors])

	const chartRef = useRef<echarts.ECharts | null>(null)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		// Apply custom chart options like reference BarChart
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, legend, dataZoom } = defaultChartSettings

		// Dynamic multi-axis configuration - one Y-axis per cluster
		const yAxisConfig = selectedClusters.map((_, index) => ({
			...yAxis,
			type: 'value',
			name: '', // Keep axis labels hidden as requested
			position: index % 2 === 0 ? 'left' : 'right', // Alternate left/right positioning
			offset: Math.floor(index / 2) * 80, // Offset multiple axes on same side for visual separation
			axisLine: { show: false }, // Hide axis line for cleaner look
			axisTick: { show: false }, // Hide tick marks
			splitLine: { show: false }, // Hide grid lines
			axisLabel: { show: false } // Hide value labels ($35b, $30b, etc.) for ultra-clean design
		}))

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				...tooltip,
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				formatter: (params: any) => {
					if (!Array.isArray(params)) return ''

					const category = params[0].axisValue
					let tooltipContent = `${category}<br/>`

					params.forEach((param: any) => {
						const value = typeof param.value === 'number' ? formatUsdWithSign(param.value) : param.value
						tooltipContent += `${param.marker}${param.seriesName}: ${value}<br/>`
					})

					return tooltipContent
				}
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid,
				top: 40,        // More top padding to prevent clipping
				bottom: 60,     // Enough bottom space for category labels
				left: 20,       // Minimal left space (no Y-axis labels)
				right: 20,      // Minimal right space (no Y-axis labels)
				containLabel: false  // Don't contain labels since we're hiding Y-axis labels
			},
			xAxis: {
				...xAxis,
				type: 'category',
				data: categories
			},
			yAxis: yAxisConfig,
			...(!hideLegend && {
				legend: {
					...legend,
					data: selectedClusters
				}
			}),
			dataZoom: hideDataZoom ? [] : [...dataZoom],
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [defaultChartSettings, series, selectedClusters, hideLegend, chartOptions, hideDataZoom, id, categories])

	useEffect(() => {
		return () => {
			const chartDom = document.getElementById(id)
			if (chartDom) {
				const chartInstance = echarts.getInstanceByDom(chartDom)
				if (chartInstance) {
					chartInstance.dispose()
				}
			}
			if (chartRef.current) {
				chartRef.current = null
			}
		}
	}, [id])

	return (
		<div className="relative">
			<div className="flex justify-end items-center gap-2 mb-2 px-2 mt-2">
				{customLegendName && customLegendOptions?.length > 1 && (
					<SelectWithCombobox
						allValues={customLegendOptions}
						selectedValues={legendOptions}
						setSelectedValues={setLegendOptions}
						selectOnlyOne={(newOption) => {
							setLegendOptions([newOption])
						}}
						label={customLegendName}
						clearAll={() => setLegendOptions([])}
						toggleAll={() => setLegendOptions(customLegendOptions)}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
						portal
					/>
				)}
				{hideDownloadButton ? null : (
					<CSVDownloadButton
						onClick={() => {
							try {
								const rows = [['Category', ...selectedClusters]]
								for (const category of categories) {
									const item = chartData.find((d) => d[groupBy] === category)
									const row = [category]
									for (const cluster of selectedClusters) {
										row.push((item ? (item[cluster] as number) || 0 : 0).toString())
									}
									rows.push(row)
								}
								const filename = `clustered-bar-chart-${slug(title || 'data')}-${
									new Date().toISOString().split('T')[0]
								}.csv`
								download(filename, rows.map((r) => r.join(',')).join('\n'))
							} catch (error) {
								console.error('Error generating CSV:', error)
							}
						}}
						smol
						className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! ml-auto"
					/>
				)}
			</div>
			<div
				id={id}
				className={containerClassName ? containerClassName : 'my-auto min-h-[500px]'}
				style={height ? { height } : undefined}
			></div>
		</div>
	)
}
