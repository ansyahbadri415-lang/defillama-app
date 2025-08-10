import { useState } from 'react'
import { Icon } from '~/components/Icon'
import toast from 'react-hot-toast'
import { DashboardItemConfig } from '../types'

interface GenerateDashboardModalProps {
	isOpen: boolean
	onClose: () => void
	onGenerate: (items: DashboardItemConfig[], dashboardName: string) => void
}

export function GenerateDashboardModal({ isOpen, onClose, onGenerate }: GenerateDashboardModalProps) {
	const [description, setDescription] = useState('')
	const [dashboardName, setDashboardName] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	if (!isOpen) return null

	const handleGenerate = async () => {
		if (!description.trim() || !dashboardName.trim()) {
			toast.error('Please provide both description and dashboard name')
			return
		}

		setIsLoading(true)

		try {
			const response = await fetch('https://mcp.llama.team/dashboard-creator', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: description.trim(),
					dashboardName: dashboardName.trim()
				})
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()

			if (!data.dashboardConfig || !Array.isArray(data.dashboardConfig.items)) {
				throw new Error('Invalid response format from AI service')
			}

			const items = data.dashboardConfig.items as DashboardItemConfig[]

			onGenerate(items, dashboardName.trim())

			// Reset form
			setDescription('')
			setDashboardName('')
			onClose()

			toast.success('Dashboard generated successfully!')
		} catch (error) {
			console.error('Failed to generate dashboard:', error)
			toast.error('Failed to generate dashboard. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleClose = () => {
		if (!isLoading) {
			setDescription('')
			setDashboardName('')
			onClose()
		}
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
			onClick={handleClose}
		>
			<div className="pro-bg1 shadow-2xl w-full max-w-lg border pro-border" onClick={(e) => e.stopPropagation()}>
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-semibold pro-text1">Generate Dashboard with AI</h2>
						<button onClick={handleClose} className="p-1 pro-hover-bg transition-colors" disabled={isLoading}>
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">Dashboard Name</label>
							<input
								type="text"
								value={dashboardName}
								onChange={(e) => setDashboardName(e.target.value)}
								placeholder="e.g., Ethereum vs Arbitrum Analysis"
								className="w-full px-3 py-2 bg-(--bg7) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1)"
								disabled={isLoading}
								autoFocus
							/>
						</div>

						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">
								Describe the dashboard you want to create
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="e.g., Build a DeFi yields dashboard with top earning protocols, comparing different chains and showing historical performance..."
								rows={5}
								className="w-full px-3 py-2 bg-(--bg7) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) resize-none"
								disabled={isLoading}
							/>
							<p className="mt-1 text-xs pro-text3">
								Be specific about what data, charts, and insights you want to see
							</p>
						</div>
					</div>

					<div className="flex gap-3 mt-8">
						<button
							onClick={handleClose}
							disabled={isLoading}
							className="flex-1 px-4 py-2 border pro-border pro-text1 hover:bg-(--bg1) transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							onClick={handleGenerate}
							disabled={!description.trim() || !dashboardName.trim() || isLoading}
							className={`flex-1 px-4 py-2 transition-colors flex items-center justify-center gap-2 ${
								description.trim() && dashboardName.trim() && !isLoading
									? 'bg-(--primary1) text-white hover:bg-(--primary1-hover)'
									: 'bg-(--bg3) pro-text3 cursor-not-allowed'
							}`}
						>
							{isLoading ? (
								<>
									<Icon name="sparkles" height={16} width={16} className="animate-spin" />
									Generating...
								</>
							) : (
								<>
									<Icon name="sparkles" height={16} width={16} />
									Generate Dashboard
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
