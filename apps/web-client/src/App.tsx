import { Layout } from '@/components/Layout'
import { PipelineEditor } from '@/components/PipelineEditor'
import { PipelineEditorPage } from '@/pages/PipelineEditorPage'
import { BatchProgressModal } from '@/components/BatchProgressModal'
import { ShortcutsModal } from '@/components/ShortcutsModal'
import { AnalysisWorkspace } from '@/pages/AnalysisWorkspace'
import { ComparisonEngine } from '@/pages/ComparisonEngine'
import { useAppStore } from '@/store/appStore'

function App() {
    const { activeView } = useAppStore()

    return (
        <>
            <Layout>
                {activeView === 'single' && <AnalysisWorkspace />}
                {activeView === 'compare' && <ComparisonEngine />}
                {activeView === 'pipeline' && <PipelineEditorPage />}
                {activeView === 'batch' && (
                    <div className="flex-1 flex items-center justify-center bg-background-dark">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-text-secondary">batch_prediction</span>
                            <p className="text-text-secondary text-lg mt-4">Batch Processing</p>
                            <p className="text-text-secondary/60 text-sm mt-1">Use Pipeline → Run Batch</p>
                        </div>
                    </div>
                )}
            </Layout>

            {/* Pipeline Editor Modal */}
            <PipelineEditor />

            {/* Batch Progress Modal */}
            <BatchProgressModal />

            {/* Shortcuts Modal */}
            <ShortcutsModal />
        </>
    )
}

export default App
