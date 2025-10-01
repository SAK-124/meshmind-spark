-- Create notebooks table (replaces the concept of single canvas)
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Notebook',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📓',
  settings JSONB DEFAULT '{"layout":"force","theme":"dark"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger function to enforce 7 notebook limit with locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.check_notebook_limit()
RETURNS TRIGGER AS $$
DECLARE
  notebook_count INT;
BEGIN
  -- Lock the user's profile row to prevent concurrent notebook creation
  PERFORM 1 FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
  
  -- Count notebooks with the lock held
  SELECT COUNT(*) INTO notebook_count 
  FROM public.notebooks 
  WHERE user_id = NEW.user_id;
  
  IF notebook_count >= 7 THEN
    RAISE EXCEPTION 'Cannot create more than 7 notebooks per user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_notebook_limit
  BEFORE INSERT ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION public.check_notebook_limit();

CREATE POLICY "Users can create notebooks"
  ON public.notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
  ON public.notebooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
  ON public.notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Add notebook_id to existing tables
ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;
ALTER TABLE public.edges ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

-- Create notes table for rich text editing
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  formatted_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes in their notebooks"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notes.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes in their notebooks"
  ON public.notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notes.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notes in their notebooks"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notes.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notes in their notebooks"
  ON public.notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = notes.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add note_id to nodes to link back to source note
ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX idx_notes_notebook_id ON public.notes(notebook_id);
CREATE INDEX idx_nodes_notebook_id ON public.nodes(notebook_id);
CREATE INDEX idx_nodes_note_id ON public.nodes(note_id);

-- Migrate existing canvases to notebooks (keep both tables for backwards compatibility)
-- Users' first canvas becomes their first notebook
INSERT INTO public.notebooks (id, user_id, title, settings, created_at, updated_at)
SELECT id, user_id, title, settings, created_at, updated_at
FROM public.canvases
ON CONFLICT (id) DO NOTHING;

-- Update nodes to reference notebooks
UPDATE public.nodes
SET notebook_id = canvas_id
WHERE notebook_id IS NULL AND canvas_id IS NOT NULL;

-- Update edges to reference notebooks
UPDATE public.edges
SET notebook_id = canvas_id
WHERE notebook_id IS NULL AND canvas_id IS NOT NULL;

-- Update clusters to reference notebooks
UPDATE public.clusters
SET notebook_id = canvas_id
WHERE notebook_id IS NULL AND canvas_id IS NOT NULL;
