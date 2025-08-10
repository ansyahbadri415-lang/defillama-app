import { Icon } from '~/components/Icon'

interface EmptyStateProps {
	onAddChart: () => void
	onGenerateClick: () => void
}

export function EmptyState({ onAddChart, onGenerateClick }: EmptyStateProps) {
	return (
		<div className="text-center py-16">
			<div className="pro-glass p-12 max-w-lg mx-auto">
				<div className="mb-6">
					<Icon name="bar-chart-2" height={64} width={64} className="mx-auto pro-text3 opacity-50" />
				</div>
				<h2 className="text-2xl font-semibold pro-text1 mb-3">No charts added yet</h2>
				<p className="pro-text2 mb-6 text-lg">Get started by generating a dashboard with AI or manually adding items</p>
				<div className="flex flex-col gap-3">
					<button
						className="px-6 py-3 bg-(--primary1) text-white flex items-center gap-2 mx-auto hover:bg-(--primary1-hover) text-base font-medium"
						onClick={onGenerateClick}
					>
						<Icon name="sparkles" height={20} width={20} />
						Generate using LlamaAI
					</button>
					<button
						className="px-6 py-3 border border-(--primary1) text-(--primary1) flex items-center gap-2 mx-auto hover:bg-(--primary1) hover:text-white transition-colors text-base font-medium"
						onClick={onAddChart}
					>
						<Icon name="plus" height={20} width={20} />
						Add Your First Chart
					</button>
				</div>
			</div>
		</div>
	)
}
