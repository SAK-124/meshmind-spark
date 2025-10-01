import { create } from 'zustand';
import { Node as FlowNode, Edge as FlowEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';

export interface NodeData {
  id: string;
  text: string;
  tags: string[];
  tasks: { text: string; done: boolean }[];
  clusterId?: string;
  clusterName?: string;
  clusterColor?: string;
  createdAt: Date;
  [key: string]: unknown; // Allow optional metadata fields when extending node data
}

export interface Cluster {
  id: string;
  name: string;
  color: string;
}

interface CanvasState {
  nodes: FlowNode<NodeData>[];
  edges: FlowEdge[];
  clusters: Cluster[];
  selectedNodeId: string | null;
  canvasId: string | null;
  
  setNodes: (nodes: FlowNode<NodeData>[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setCanvasId: (id: string) => void;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  addNode: (text: string, tags: string[]) => void;
  addEdge: (source: string, target: string, type?: string, label?: string) => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  clusters: [],
  selectedNodeId: null,
  canvasId: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setClusters: (clusters) => set({ clusters }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setCanvasId: (id) => set({ canvasId: id }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode<NodeData>[],
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  addNode: (text, tags) => {
    const nodeId = `node-${Date.now()}`;
    const newNode: FlowNode<NodeData> = {
      id: nodeId,
      type: 'custom',
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        id: nodeId,
        text,
        tags,
        tasks: [],
        createdAt: new Date(),
      },
    };
    
    set({ nodes: [...get().nodes, newNode] });
  },
  
  addEdge: (source, target, type = 'untyped', label) => {
    const newEdge: FlowEdge = {
      id: `edge-${Date.now()}`,
      source,
      target,
      type: 'smoothstep',
      animated: true,
      data: { edgeType: type, label },
      label,
    };
    
    set({ edges: [...get().edges, newEdge] });
  },
  
  updateNode: (id, updates) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      ),
    });
  },
  
  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter(node => node.id !== id),
      edges: get().edges.filter(edge => edge.source !== id && edge.target !== id),
    });
  },
  
  deleteEdge: (id) => {
    set({
      edges: get().edges.filter(edge => edge.id !== id),
    });
  },
}));
