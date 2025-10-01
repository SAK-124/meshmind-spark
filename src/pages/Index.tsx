import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, Network, Sparkles, Zap } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-8 max-w-4xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              NoteMesh
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl text-foreground/90 font-light max-w-2xl mx-auto">
            Free-form chat that morphs into a mind map as you type
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
              <Network className="w-8 h-8 text-accent mb-4" />
              <h3 className="text-lg font-semibold mb-2">Visual Connections</h3>
              <p className="text-sm text-muted-foreground">
                See relationships emerge naturally as you type. Connect ideas with a simple drag.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
              <Sparkles className="w-8 h-8 text-accent mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Clustering</h3>
              <p className="text-sm text-muted-foreground">
                Let AI automatically organize your thoughts into meaningful groups.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
              <Zap className="w-8 h-8 text-accent mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Offline-first design. Works instantly, syncs when you're online.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-4 justify-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              Sign In
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            No credit card required • Local-first • End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
