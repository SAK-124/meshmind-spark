import { create } from 'zustand';
import type { Tables } from '@/integrations/supabase/types';

type Notebook = Tables<'notebooks'>;
type Note = Tables<'notes'>;

interface NotebookState {
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  notesByNotebook: Map<string, Note[]>;
  currentNote: Note | null;
  
  setNotebooks: (notebooks: Notebook[]) => void;
  setCurrentNotebook: (notebook: Notebook | null) => void;
  setNotesForNotebook: (notebookId: string, notes: Note[]) => void;
  addNoteToNotebook: (notebookId: string, note: Note) => void;
  setCurrentNote: (note: Note | null) => void;
  
  addNotebook: (notebook: Notebook) => boolean;
  updateNotebook: (id: string, updates: Partial<Notebook>) => void;
  deleteNotebook: (id: string) => void;
  
  getNotesForNotebook: (notebookId: string) => Note[];
  updateNote: (noteUpdates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  canAddNotebook: () => boolean;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  currentNotebook: null,
  notesByNotebook: new Map(),
  currentNote: null,
  
  setNotebooks: (notebooks) => set({ notebooks }),
  
  setCurrentNotebook: (notebook) => set({ currentNotebook: notebook }),
  
  setNotesForNotebook: (notebookId, notes) => {
    const newNotesMap = new Map(get().notesByNotebook);
    newNotesMap.set(notebookId, notes);
    set({ notesByNotebook: newNotesMap });
  },
  
  addNoteToNotebook: (notebookId, note) => {
    const { notesByNotebook } = get();
    const newNotesMap = new Map(notesByNotebook);
    const existingNotes = newNotesMap.get(notebookId) || [];
    newNotesMap.set(notebookId, [...existingNotes, note]);
    set({ notesByNotebook: newNotesMap });
  },
  
  setCurrentNote: (note) => set({ currentNote: note }),
  
  getNotesForNotebook: (notebookId) => {
    return get().notesByNotebook.get(notebookId) || [];
  },
  
  canAddNotebook: () => get().notebooks.length < 7,
  
  addNotebook: (notebook) => {
    const { notebooks, canAddNotebook } = get();
    
    if (!canAddNotebook()) {
      return false;
    }
    
    set({ notebooks: [...notebooks, notebook] });
    return true;
  },
  
  updateNotebook: (id, updates) => set({
    notebooks: get().notebooks.map(nb =>
      nb.id === id ? { ...nb, ...updates } : nb
    ),
    currentNotebook: get().currentNotebook?.id === id
      ? { ...get().currentNotebook!, ...updates }
      : get().currentNotebook
  }),
  
  deleteNotebook: (id) => {
    const { notebooks, currentNotebook, currentNote, notesByNotebook } = get();
    const newNotesMap = new Map(notesByNotebook);
    newNotesMap.delete(id);
    
    set({
      notebooks: notebooks.filter(nb => nb.id !== id),
      currentNotebook: currentNotebook?.id === id ? null : currentNotebook,
      currentNote: currentNote?.notebook_id === id ? null : currentNote,
      notesByNotebook: newNotesMap
    });
  },
  
  updateNote: (noteUpdates) => {
    const { currentNote, notesByNotebook } = get();
    if (!currentNote) return;
    
    const updatedNote = { ...currentNote, ...noteUpdates };
    const notebookId = currentNote.notebook_id;
    const newNotesMap = new Map(notesByNotebook);
    const notes = newNotesMap.get(notebookId) || [];
    const updatedNotes = notes.map(n => n.id === currentNote.id ? updatedNote : n);
    newNotesMap.set(notebookId, updatedNotes);
    
    set({
      currentNote: updatedNote,
      notesByNotebook: newNotesMap
    });
  },
  
  deleteNote: (noteId) => {
    const { currentNote, notesByNotebook } = get();
    
    const newNotesMap = new Map(notesByNotebook);
    for (const [notebookId, notes] of newNotesMap.entries()) {
      const filtered = notes.filter(n => n.id !== noteId);
      if (filtered.length !== notes.length) {
        newNotesMap.set(notebookId, filtered);
        break;
      }
    }
    
    set({
      notesByNotebook: newNotesMap,
      currentNote: currentNote?.id === noteId ? null : currentNote
    });
  },
}));
