import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/store/canvasStore';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

const Canvas = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addEdge: storeAddEdge,
  } = useCanvasStore();

  const onConnect = useCallback(
    (connection: Connection) => {
      storeAddEdge(connection.source, connection.target);
    },
    [storeAddEdge]
  );

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-gradient-to-br from-background via-background to-primary/5"
      >
        <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
        <Controls className="bg-card border-border" />
        <MiniMap
          className="bg-card border-border"
          nodeColor={(node) => {
            return 'hsl(var(--primary))';
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default Canvas;
