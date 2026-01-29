import { Layout } from '@/components/Layout'
import { PipelineEditor } from '@/components/PipelineEditor'
import { PipelineEditorPage } from '@/pages/PipelineEditorPage'
import { BatchProcessingPage } from '@/pages/BatchProcessingPage'
import { BatchProgressModal } from '@/components/BatchProgressModal'
import { ShortcutsModal } from '@/components/ShortcutsModal'
import { AboutModal } from '@/components/AboutModal'
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
                {activeView === 'batch' && <BatchProcessingPage />}
            </Layout>

            {/* Pipeline Editor Modal */}
            <PipelineEditor />

            {/* Batch Progress Modal */}
            <BatchProgressModal />

            {/* Shortcuts Modal */}
            <ShortcutsModal />

            {/* About Modal */}
            <AboutModal />
        </>
    )
}

export default App
