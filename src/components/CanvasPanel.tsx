import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import Canvas from '@/components/Canvas';

interface CanvasPanelProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const CanvasPanel = ({ isFullscreen, onToggleFullscreen }: CanvasPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <h2 className="text-lg font-semibold">Mind Map</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          data-testid="button-fullscreen-canvas"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="flex-1">
        <Canvas />
      </div>
    </div>
  );
};

export default CanvasPanel;
