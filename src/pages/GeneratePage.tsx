import { useEffect } from 'react';
import { GenerateShell } from '../components/generate/GenerateShell';
import { useGenerateStore } from '../store/useGenerateStore';

export default function GeneratePage() {
  const restoreFromProject = useGenerateStore((s) => s.restoreFromProject);

  useEffect(() => {
    restoreFromProject();
  }, [restoreFromProject]);

  return (
    <div className="h-screen flex flex-col bg-bg font-sans text-text">
      <GenerateShell />
    </div>
  );
}
