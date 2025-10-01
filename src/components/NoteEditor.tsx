import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useNotebookStore } from '@/store/notebookStore';

interface NoteEditorProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const NoteEditor = ({ isFullscreen, onToggleFullscreen }: NoteEditorProps) => {
  const { currentNotebook, currentNote, updateNote } = useNotebookStore();
  const [content, setContent] = useState(currentNote?.content || '');

  const handleContentChange = (value: string) => {
    setContent(value);
    if (currentNote) {
      updateNote({ content: value });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <h2 className="text-lg font-semibold">
          {currentNotebook?.title || 'Note Editor'}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="button-improve-note"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Improve Note
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
