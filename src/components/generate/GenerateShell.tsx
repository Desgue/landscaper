import { useGenerateStore } from '../../store/useGenerateStore';
import { GenerateNav } from './GenerateNav';
import { GenerateHeader } from './GenerateHeader';
import { Workspace } from './Workspace';
import { ErrorToast } from '../ErrorToast';
import { InitialGeneration } from './features/InitialGeneration';
import { MultiView } from './features/MultiView';
import { SeasonalVariants } from './features/SeasonalVariants';
import { ConversationalEdit } from './features/ConversationalEdit';
import { ZoneEdit } from './features/ZoneEdit';
import { MaterialSwap } from './features/MaterialSwap';
import { PlantReference } from './features/PlantReference';
import { DraftToFinal } from './features/DraftToFinal';
import { Outpainting } from './features/Outpainting';
import { StyleTransfer } from './features/StyleTransfer';
import { ExportPanel } from './features/ExportPanel';
import type { FeatureId } from '../../types/generate';

const FEATURE_COMPONENTS: Record<FeatureId, React.ComponentType> = {
  'initial': InitialGeneration,
  'multi-view': MultiView,
  'seasonal': SeasonalVariants,
  'conversational': ConversationalEdit,
  'zone': ZoneEdit,
  'material': MaterialSwap,
  'plants': PlantReference,
  'draft-final': DraftToFinal,
  'outpainting': Outpainting,
  'style-transfer': StyleTransfer,
  'export': ExportPanel,
};

// Features that own the full main area (no workspace/controls split)
const FULL_AREA_FEATURES: FeatureId[] = ['conversational', 'material'];

export function GenerateShell() {
  const activeFeature = useGenerateStore((s) => s.activeFeature);
  const setActiveFeature = useGenerateStore((s) => s.setActiveFeature);

  const FeatureComponent = FEATURE_COMPONENTS[activeFeature];
  const isFullArea = FULL_AREA_FEATURES.includes(activeFeature);

  return (
    <div className="flex flex-col h-full">
      <ErrorToast />
      <GenerateHeader />
      <div className="flex flex-1 overflow-hidden">
        <GenerateNav
          activeFeature={activeFeature}
          onSelect={setActiveFeature}
        />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          {isFullArea ? (
            <div className="flex-1 overflow-auto">
              <FeatureComponent />
            </div>
          ) : (
            <>
              {/* Workspace — image area */}
              <div className="flex-1 min-h-0 overflow-auto">
                <Workspace />
              </div>
              {/* Controls — feature-specific */}
              <div className="border-t border-border bg-bg-card overflow-auto max-h-[50vh]">
                <FeatureComponent />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
