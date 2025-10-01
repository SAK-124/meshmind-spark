import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NoteEditor from '@/components/NoteEditor';
import CanvasPanel from '@/components/CanvasPanel';
import ChatInput from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { LogOut, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCanvasStore } from '@/store/canvasStore';
import type { Cluster } from '@/store/canvasStore';
import { toPng } from 'html-to-image';
import type { Edge as FlowEdge } from '@xyflow/react';
import type { User } from '@supabase/supabase-js';

interface ClusterResponse {
  clusters?: Array<{
    name?: string;
    color?: string;
    nodeIds?: string[];
  }>;
  usage?: {
    count: number;
    limit: number;
    resetAt?: string;
  };
}

type ClusterEdgeData = {
  edgeType?: string;
  label?: string;
};

const APP_VERSION = 'v0.2.0';

const CanvasPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const navigate = useNavigate();
  const {
    nodes,
    edges,
    setCanvasId,
    setNodes,
    setEdges,
    setClusters,
  } = useCanvasStore();

  const loadCanvasData = useCallback(async (canvasId: string) => {
    // Load nodes and edges from database
    // This is a placeholder - you'd implement the full loading logic
    console.log('Loading canvas data for:', canvasId);
  }, []);

  const loadOrCreateCanvas = useCallback(async (userId: string) => {
    try {
      // Try to load existing canvas
      const { data: canvases, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (canvases && canvases.length > 0) {
        setCanvasId(canvases[0].id);
        await loadCanvasData(canvases[0].id);
      } else {
        const { data: newCanvas, error: createError } = await supabase
          .from('canvases')
          .insert({ user_id: userId, title: 'My First Canvas' })
          .select()
          .single();

        if (createError) throw createError;
        setCanvasId(newCanvas.id);
      }
    } catch (error: unknown) {
      console.error('Error loading canvas:', error);
      const message = error instanceof Error ? error.message : 'Failed to load canvas';
      toast.error(message);
    }
  }, [loadCanvasData, setCanvasId]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      await loadOrCreateCanvas(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loadOrCreateCanvas]);

  const handleCluster = async () => {
    if (nodes.length < 2) {
      toast.error('Need at least 2 nodes to cluster');
      return;
    }

    if (!user) {
      toast.error('Please sign in again to cluster nodes.');
      return;
    }

    setClustering(true);
    try {
      const nodeData = nodes.map(n => ({
        id: n.id,
        text: n.data.text,
        tags: n.data.tags
      }));

      const { data, error } = await supabase.functions.invoke('cluster-nodes', {
        body: { nodes: nodeData, userId: user.id }
      });

      if (error) throw error;

      const clusterData = (data as ClusterResponse) ?? {};
      const parsedClusters = Array.isArray(clusterData.clusters) ? clusterData.clusters : [];

      if (parsedClusters.length === 0) {
        toast.error('No clusters returned. Try again with more detailed nodes.');
        return;
      }

      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      const assignments = new Map<string, { clusterId: string; name: string; color: string }>();
      const clusterMembers = new Map<string, string[]>();

      const formattedClusters = parsedClusters.reduce<Cluster[]>((acc, cluster, index) => {
        const clusterId = `cluster-${index}`;
        const name = cluster.name?.trim() || `Cluster ${index + 1}`;
        const color = cluster.color?.trim() || `hsl(var(--cluster-${(index % 5) + 1}))`;
        const validNodeIds = (cluster.nodeIds ?? []).filter((nodeId) => nodeMap.has(nodeId));

        if (validNodeIds.length === 0) {
          return acc;
        }

        validNodeIds.forEach((nodeId) => {
          assignments.set(nodeId, { clusterId, name, color });
        });

        clusterMembers.set(clusterId, validNodeIds);
        acc.push({ id: clusterId, name, color });
        return acc;
      }, []);

      if (formattedClusters.length === 0) {
        toast.error('Unable to map clusters to nodes. Please add more detail and try again.');
        return;
      }

      const updatedNodes = nodes.map(node => {
        const assignment = assignments.get(node.id);
        const { clusterId: _prevClusterId, clusterName: _prevClusterName, clusterColor: _prevClusterColor, ...restData } = node.data;

        if (!assignment) {
          return {
            ...node,
            data: { ...restData },
          };
        }

        return {
          ...node,
          data: {
            ...restData,
            clusterId: assignment.clusterId,
            clusterName: assignment.name,
            clusterColor: assignment.color,
          },
        };
      });

      const manualEdges = edges.filter(edge => {
        const edgeData = edge.data as ClusterEdgeData | undefined;
        return edgeData?.edgeType !== 'cluster';
      });

      const generatedEdges: FlowEdge[] = [];
      formattedClusters.forEach((cluster) => {
        const clusterNodes = clusterMembers.get(cluster.id) ?? [];

        if (clusterNodes.length < 2) return;

        const anchor = clusterNodes[0];
        clusterNodes.slice(1).forEach((targetId, idx) => {
          const edgeId = `edge-${cluster.id}-${anchor}-${targetId}-${idx}`;
          const exists = manualEdges.some(edge =>
            (edge.source === anchor && edge.target === targetId) ||
            (edge.source === targetId && edge.target === anchor)
          ) || generatedEdges.some(edge =>
            (edge.source === anchor && edge.target === targetId) ||
            (edge.source === targetId && edge.target === anchor)
          );

          if (!exists) {
            generatedEdges.push({
              id: edgeId,
              source: anchor,
              target: targetId,
              type: 'smoothstep',
              animated: true,
              data: { edgeType: 'cluster', label: cluster.name },
              label: cluster.name,
            });
          }
        });
      });

      setNodes(updatedNodes);
      setEdges([...manualEdges, ...generatedEdges]);
      setClusters(formattedClusters);

      const remainingUses = clusterData.usage
        ? Math.max(clusterData.usage.limit - clusterData.usage.count, 0)
        : null;
      const successMessage = remainingUses !== null
        ? `Nodes clustered successfully! ${remainingUses} of ${clusterData.usage?.limit ?? 0} remaining today.`
        : 'Nodes clustered successfully!';

      toast.success(successMessage);
      console.log('Clusters:', formattedClusters, 'Usage:', clusterData.usage);

    } catch (error: unknown) {
      console.error('Clustering error:', error);
      const message = error instanceof Error ? error.message : 'Failed to cluster nodes';
      toast.error(message);
    } finally {
      setClustering(false);
    }
  };

  const handleExportPNG = async () => {
    try {
      const canvas = document.querySelector('.react-flow') as HTMLElement;
      if (!canvas) return;

      const dataUrl = await toPng(canvas, {
        backgroundColor: 'hsl(220 20% 8%)',
        quality: 1.0,
      });

      const link = document.createElement('a');
      link.download = `notemesh-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Canvas exported as PNG');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export canvas');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading your canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" data-testid="text-app-title">
            NoteMesh
          </h1>
          <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
          <span className="text-sm text-muted-foreground" data-testid="text-stats">
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCluster}
            disabled={clustering || nodes.length < 2}
            data-testid="button-auto-cluster"
          >
            {clustering ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Clustering...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-Cluster
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPNG}
            data-testid="button-export-png"
          >
            <Download className="mr-2 h-4 w-4" />
            Export PNG
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        {editorFullscreen ? (
          <NoteEditor 
            isFullscreen={editorFullscreen}
            onToggleFullscreen={() => setEditorFullscreen(false)}
          />
        ) : canvasFullscreen ? (
          <CanvasPanel
            isFullscreen={canvasFullscreen}
            onToggleFullscreen={() => setCanvasFullscreen(false)}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={40} minSize={20}>
              <NoteEditor 
                isFullscreen={false}
                onToggleFullscreen={() => setEditorFullscreen(true)}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30}>
              <CanvasPanel
                isFullscreen={false}
                onToggleFullscreen={() => setCanvasFullscreen(true)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
      
      <ChatInput onCluster={handleCluster} />
    </div>
  );
};

export default CanvasPage;
