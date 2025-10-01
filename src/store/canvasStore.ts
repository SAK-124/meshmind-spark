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

function deepCloneWithDates<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneWithDates(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepCloneWithDates(obj[key]);
    }
  }
  
  return cloned;
}

interface HistoryState {
  nodes: FlowNode<NodeData>[];
  edges: FlowEdge[];
  clusters: Cluster[];
}

interface CanvasState {
  nodes: FlowNode<NodeData>[];
  edges: FlowEdge[];
  clusters: Cluster[];
  selectedNodeId: string | null;
  canvasId: string | null;
  notebookId: string | null;
  history: HistoryState[];
  historyIndex: number;
  
  setNodes: (nodes: FlowNode<NodeData>[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setCanvasId: (id: string) => void;
  setNotebookId: (id: string | null) => void;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  addNode: (text: string, tags: string[]) => void;
  addEdge: (source: string, target: string, type?: string, label?: string) => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  clusters: [],
  selectedNodeId: null,
  canvasId: null,
  notebookId: null,
  history: [{ nodes: [], edges: [], clusters: [] }],
  historyIndex: 0,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setClusters: (clusters) => set({ clusters }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setCanvasId: (id) => set({ canvasId: id }),
  setNotebookId: (id) => set({ notebookId: id }),
  
  onNodesChange: (changes) => {
    const hasSignificantChange = changes.some(
      change => change.type === 'remove' || change.type === 'add' || change.type === 'position'
    );
    
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode<NodeData>[],
    });
    
    if (hasSignificantChange) {
      get().saveToHistory();
    }
  },
  
  onEdgesChange: (changes) => {
    const hasSignificantChange = changes.some(
      change => change.type === 'remove' || change.type === 'add'
    );
    
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
    
    if (hasSignificantChange) {
      get().saveToHistory();
    }
  },
  
  saveToHistory: () => {
    const { nodes, edges, clusters, history, historyIndex } = get();
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: deepCloneWithDates(nodes),
      edges: deepCloneWithDates(edges),
      clusters: deepCloneWithDates(clusters)
    });
    
    set({
      history: newHistory.slice(-50),
      historyIndex: Math.min(newHistory.length - 1, 49)
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
    get().saveToHistory();
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
    get().saveToHistory();
  },
  
  updateNode: (id, updates) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      ),
    });
    get().saveToHistory();
  },
  
  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter(node => node.id !== id),
      edges: get().edges.filter(edge => edge.source !== id && edge.target !== id),
    });
    get().saveToHistory();
  },
  
  deleteEdge: (id) => {
    set({
      edges: get().edges.filter(edge => edge.id !== id),
    });
    get().saveToHistory();
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: deepCloneWithDates(prevState.nodes),
        edges: deepCloneWithDates(prevState.edges),
        clusters: deepCloneWithDates(prevState.clusters),
        historyIndex: historyIndex - 1
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: deepCloneWithDates(nextState.nodes),
        edges: deepCloneWithDates(nextState.edges),
        clusters: deepCloneWithDates(nextState.clusters),
        historyIndex: historyIndex + 1
      });
    }
  },
  
  canUndo: () => get().historyIndex > 0,
  
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      clusters: [],
      selectedNodeId: null
    });
    get().saveToHistory();
  },
}));
