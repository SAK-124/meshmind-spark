import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { toast } from 'sonner';

interface ChatInputProps {
  onCluster?: () => void;
}

const ChatInput = ({ onCluster }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const { addNode } = useCanvasStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim()) return;

    // Parse tags from message
    const tagMatches = message.match(/#\w+/g) || [];
    const tags = tagMatches.map(tag => tag.slice(1));

    // Remove tags from text
    const cleanText = message.replace(/#\w+/g, '').trim();

    if (cleanText) {
      addNode(cleanText, tags);
      toast.success('Node created');
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border/50">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your thoughts... Use #tags to categorize"
            className="resize-none bg-background/50 min-h-[44px] max-h-[200px]"
            rows={1}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={!message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
            {onCluster && (
              <Button
                onClick={onCluster}
                size="icon"
                variant="outline"
                title="Auto-cluster nodes"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Press Enter to send • Shift+Enter for new line • Use #tags to organize
        </p>
      </div>
    </div>
  );
};

export default ChatInput;