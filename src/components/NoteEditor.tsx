import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react';
import { useNotebookStore } from '@/store/notebookStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NoteEditorProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const NoteEditor = ({ isFullscreen, onToggleFullscreen }: NoteEditorProps) => {
  const { currentNotebook, currentNote, updateNote } = useNotebookStore();
  const [content, setContent] = useState(currentNote?.content || '');
  const [isImproving, setIsImproving] = useState(false);
  const [autoFormat, setAutoFormat] = useState(false);
  const { toast } = useToast();
  const autoFormatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (currentNote) {
      updateNote({ content: value });
    }

    // Clear existing timer
    if (autoFormatTimerRef.current) {
      clearTimeout(autoFormatTimerRef.current);
    }

    // Set new timer for auto-format
    if (autoFormat && value.trim()) {
      autoFormatTimerRef.current = setTimeout(() => {
        handleImproveNote(true);
      }, 20000); // 20 seconds
    }
  };

  const handleImproveNote = async (isAuto = false) => {
    if (!content.trim() || isImproving) return;

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-note', {
        body: { content }
      });

      if (error) throw error;

      if (data?.improvedContent) {
        setContent(data.improvedContent);
        if (currentNote) {
          updateNote({ content: data.improvedContent });
        }
        toast({
          title: isAuto ? "Note auto-formatted" : "Note improved",
          description: "Your note has been enhanced.",
        });
      }
    } catch (error: any) {
      console.error('Error improving note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to improve note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  useEffect(() => {
    setContent(currentNote?.content || '');
  }, [currentNote]);

  useEffect(() => {
    return () => {
      if (autoFormatTimerRef.current) {
        clearTimeout(autoFormatTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <h2 className="text-lg font-semibold">
          {currentNotebook?.title || 'Note Editor'}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={autoFormat ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoFormat(!autoFormat)}
            title={autoFormat ? "Auto-format enabled" : "Auto-format disabled"}
          >
            <Zap className={`h-4 w-4 ${autoFormat ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleImproveNote(false)}
            disabled={isImproving || !content.trim()}
            data-testid="button-improve-note"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isImproving ? 'animate-spin' : ''}`} />
            {isImproving ? 'Improving...' : 'Improve Note'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            data-testid="button-fullscreen-editor"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start writing your notes here... Use the 'Improve Note' button to enhance your text with AI."
          className="h-full resize-none font-mono text-sm"
          data-testid="input-note-content"
        />
      </div>
    </div>
  );
};

export default NoteEditor;
