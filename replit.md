# NoteMesh

## Overview
NoteMesh is a React-based mind mapping application that transforms free-form chat into interactive mind maps. It features AI-powered clustering, visual connections, and offline-first design.

## Project Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Router**: React Router v6
- **UI Components**: Shadcn UI with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query v5)
- **Mind Map Visualization**: @xyflow/react
- **Backend**: Supabase (authentication + database)

### Project Structure
```
src/
├── components/
│   ├── ui/           # Shadcn UI components
│   ├── Canvas.tsx    # Mind map canvas using React Flow
│   ├── ChatInput.tsx # User input for creating nodes
│   └── CustomNode.tsx # Custom node component for mind map
├── pages/
│   ├── Index.tsx     # Landing page
│   ├── Auth.tsx      # Authentication page
│   ├── CanvasPage.tsx # Main canvas/mind map page
│   └── NotFound.tsx  # 404 page
├── store/
│   └── canvasStore.ts # Zustand store for canvas state
├── integrations/
│   └── supabase/     # Supabase client and types
└── lib/
    └── utils.ts      # Utility functions
```

## Development Setup

### Running Locally
- **Dev Server**: `npm run dev` (runs on port 5000)
- **Build**: `npm run build`
- **Preview**: `npm run preview`

### Configuration
- Vite is configured to run on `0.0.0.0:5000` for Replit compatibility
- HMR (Hot Module Reload) uses WSS protocol on port 443
- Supabase credentials are pre-configured in `src/integrations/supabase/client.ts`

## Key Features
1. **Visual Connections**: See relationships emerge naturally as you type
2. **AI-Powered Clustering**: Automatically organize thoughts into meaningful groups
3. **Lightning Fast**: Offline-first design with online sync
4. **Authentication**: Email/password authentication via Supabase
5. **Export**: Download mind maps as PNG images

## Deployment
Configured for Replit Autoscale deployment:
- Build: `npm run build`
- Run: `npm run preview -- --host 0.0.0.0 --port 5000`

## Recent Changes
- **2025-10-01**: Initial Replit setup
  - Updated Vite config for port 5000 and 0.0.0.0 host
  - Configured HMR for Replit's proxy environment
  - Set up workflow for development server
  - Configured deployment settings for production
