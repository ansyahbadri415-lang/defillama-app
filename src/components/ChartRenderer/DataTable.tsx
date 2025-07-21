import React from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { ChartDTO } from './types'
import { formattedNum } from '../../utils'

interface DataTableProps {
	dto: ChartDTO
}

const DataTable: React.FC<DataTableProps> = ({ dto }) => {
	const columns = React.useMemo(() => {
		let xAxisColumn = null
		if (dto.config.xAxis?.dataColumn) {
			xAxisColumn = {
				accessorKey: dto.config.xAxis.dataColumn,
				header: dto.config.xAxis.label || 'Category'
			}
		}

		let yAxisColumns = (dto.config.yAxes || (dto.config.yAxis ? [dto.config.yAxis] : []))
			.filter((axis) => axis && axis.dataColumn)
			.map((axis) => ({
				accessorKey: axis.dataColumn,
				header: axis.label || 'Value',
				cell: (info: any) => {
					const value = info.getValue()
					if (typeof value === 'number') {
						const prefix = axis.unit === '$' ? '$' : ''
						const suffix = axis.unit === '%' ? '%' : ''
						return `${prefix}${formattedNum(value)}${suffix}`
					}
					return String(value || '')
				}
			}))

		if (yAxisColumns.length === 0 && dto.data.length > 0) {
			const dataKeys = Object.keys(dto.data[0]).filter((key) => key !== dto.config.xAxis?.dataColumn)
			yAxisColumns = dataKeys.map((key) => ({
				accessorKey: key,
				header: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
				cell: (info: any) => {
					const value = info.getValue()
					if (typeof value === 'number') {
						return formattedNum(value)
					}
					return String(value || '')
				}
			}))
		}

		return [xAxisColumn, ...yAxisColumns].filter(Boolean)
	}, [dto])

	const table = useReactTable({
		data: dto.data,
		columns,
		getCoreRowModel: getCoreRowModel()
	})

	return (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
			{dto.config.title && (
				<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{dto.config.title}</h3>
					{dto.config.description && (
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{dto.config.description}</p>
					)}
				</div>
			)}

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead className="bg-gray-50 dark:bg-gray-800">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{dto.data.length === 0 && (
				<div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No data available</div>
			)}
		</div>
	)
}

export default DataTable
