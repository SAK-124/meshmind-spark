import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '@/store/canvasStore';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

const CustomNode = memo(({ data }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className="min-w-[200px] max-w-[300px] bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-accent" />
      
      <div className="p-4 space-y-2">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {nodeData.text}
        </p>
        
        {nodeData.tags && nodeData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nodeData.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        {nodeData.tasks && nodeData.tasks.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border/50">
            {nodeData.tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox checked={task.done} disabled />
                <span className={`text-xs ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent" />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;