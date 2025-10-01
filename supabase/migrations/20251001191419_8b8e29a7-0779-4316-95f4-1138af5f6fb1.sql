-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create canvases table
CREATE TABLE public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  settings JSONB DEFAULT '{"layout":"force","theme":"dark"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own canvases"
  ON public.canvases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create canvases"
  ON public.canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvases"
  ON public.canvases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvases"
  ON public.canvases FOR DELETE
  USING (auth.uid() = user_id);

-- Create nodes table
CREATE TABLE public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  cluster_id UUID,
  tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nodes in their canvases"
  ON public.nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = nodes.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create nodes in their canvases"
  ON public.nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = nodes.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in their canvases"
  ON public.nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = nodes.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes in their canvases"
  ON public.nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = nodes.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

-- Create edges table
CREATE TABLE public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  edge_type TEXT DEFAULT 'untyped',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edges in their canvases"
  ON public.edges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = edges.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create edges in their canvases"
  ON public.edges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = edges.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete edges in their canvases"
  ON public.edges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = edges.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

-- Create clusters table
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clusters in their canvases"
  ON public.clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = clusters.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage clusters in their canvases"
  ON public.clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.canvases
      WHERE canvases.id = clusters.canvas_id
      AND canvases.user_id = auth.uid()
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON public.canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();