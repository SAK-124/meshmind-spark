import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Canvas from '@/components/Canvas';
import ChatInput from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { LogOut, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCanvasStore } from '@/store/canvasStore';
import { toPng } from 'html-to-image';

const CanvasPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const navigate = useNavigate();
  const { nodes, edges, canvasId, setCanvasId } = useCanvasStore();

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadOrCreateCanvas = async (userId: string) => {
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
        // Load nodes and edges
        await loadCanvasData(canvases[0].id);
      } else {
        // Create new canvas
        const { data: newCanvas, error: createError } = await supabase
          .from('canvases')
          .insert({ user_id: userId, title: 'My First Canvas' })
          .select()
          .single();

        if (createError) throw createError;
        setCanvasId(newCanvas.id);
      }
    } catch (error: any) {
      console.error('Error loading canvas:', error);
      toast.error('Failed to load canvas');
    }
  };

  const loadCanvasData = async (canvasId: string) => {
    // Load nodes and edges from database
    // This is a placeholder - you'd implement the full loading logic
    console.log('Loading canvas data for:', canvasId);
  };

  const handleCluster = async () => {
    if (nodes.length < 2) {
      toast.error('Need at least 2 nodes to cluster');
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
        body: { nodes: nodeData }
      });

      if (error) throw error;

      toast.success('Nodes clustered successfully!');
      console.log('Clusters:', data);
      
      // Apply clustering results to nodes
      // This is a placeholder - you'd implement the full clustering application
      
    } catch (error: any) {
      console.error('Clustering error:', error);
      toast.error(error.message || 'Failed to cluster nodes');
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
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            NoteMesh
          </h1>
          <span className="text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCluster}
            disabled={clustering || nodes.length < 2}
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
          <Button variant="outline" size="sm" onClick={handleExportPNG}>
            <Download className="mr-2 h-4 w-4" />
            Export PNG
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <div className="flex-1">
        <Canvas />
      </div>
      
      <ChatInput onCluster={handleCluster} />
    </div>
  );
};

export default CanvasPage;