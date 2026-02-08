"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { 
  Search, 
  User, 
  Mic, 
  Inbox as InboxIcon, 
  Loader2, 
  FileText, 
  CheckSquare 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Build a flat list of all search results for keyboard navigation
interface FlatResult {
  type: 'patient' | 'transcript' | 'inbox' | 'document' | 'task';
  id: string;
  data: any;
}

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, loading, isOpen, setIsOpen, hasResults } = useGlobalSearch();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Build flat results list for keyboard navigation
  const flatResults = useMemo<FlatResult[]>(() => {
    const flat: FlatResult[] = [];
    results.patients.forEach(p => flat.push({ type: 'patient', id: p.id, data: p }));
    results.transcripts.forEach(t => flat.push({ type: 'transcript', id: t.id, data: t }));
    results.documents.forEach(d => flat.push({ type: 'document', id: d.id, data: d }));
    results.tasks.forEach(t => flat.push({ type: 'task', id: t.id, data: t }));
    results.inbox.forEach(i => flat.push({ type: 'inbox', id: i.id, data: i }));
    return flat;
  }, [results]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [flatResults]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleNavigate = useCallback((result: FlatResult) => {
    setIsOpen(false);
    setQuery('');
    
    switch (result.type) {
      case 'patient':
        navigate(`/patients/${result.id}`);
        break;
      case 'transcript':
        navigate(`/transcripts?openTranscript=${result.id}`);
        break;
      case 'inbox':
        navigate(`/inbox?openMessage=${result.id}`);
        break;
      case 'document':
        navigate(`/documents?openDocument=${result.id}`);
        break;
      case 'task':
        navigate(`/tasks?openTask=${result.id}`);
        break;
    }
  }, [navigate, setIsOpen, setQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        return;
      }

      // Only handle navigation when open and has results
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatResults.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      }

      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < flatResults.length) {
        e.preventDefault();
        handleNavigate(flatResults[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex, handleNavigate, setIsOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('[data-search-item]');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Get the index in flat results for a given type and id
  const getFlatIndex = (type: string, id: string) => {
    return flatResults.findIndex(r => r.type === type && r.id === id);
  };

  const showDropdown = isOpen && query.trim().length > 0;

  const statusLabels: Record<string, string> = {
    pending: 'À faire',
    in_progress: 'En cours',
    completed: 'Terminée',
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          data-testid="global-search-input"
          type="text"
          placeholder="Rechercher patients, transcripts, documents... (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4 h-10 bg-muted/50 border-border/50 focus:bg-background"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={resultsRef}
          data-testid="global-search-results"
          className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-auto"
        >
          {!hasResults && !loading && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucun résultat pour "{query}"
            </div>
          )}

          {/* Patients Section */}
          {results.patients.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Patients
              </div>
              {results.patients.map((patient) => {
                const flatIndex = getFlatIndex('patient', patient.id);
                return (
                  <button
                    key={patient.id}
                    data-testid="global-search-item-patient"
                    data-search-item
                    onClick={() => handleNavigate({ type: 'patient', id: patient.id, data: patient })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      flatIndex === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <HighlightText 
                          text={`${patient.first_name} ${patient.last_name}`} 
                          query={query} 
                        />
                      </div>
                      {patient.phone && (
                        <div className="text-xs text-muted-foreground truncate">
                          <HighlightText text={patient.phone} query={query} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Transcripts Section */}
          {results.transcripts.length > 0 && (
            <div className={cn('p-2', results.patients.length > 0 && 'border-t')}>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transcripts
              </div>
              {results.transcripts.map((transcript) => {
                const flatIndex = getFlatIndex('transcript', transcript.id);
                return (
                  <button
                    key={transcript.id}
                    data-testid="global-search-item-transcript"
                    data-search-item
                    onClick={() => handleNavigate({ type: 'transcript', id: transcript.id, data: transcript })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      flatIndex === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <Mic className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{transcript.patient_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        <HighlightText text={transcript.excerpt} query={query} />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(transcript.created_at), 'dd MMM', { locale: fr })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Documents Section */}
          {results.documents.length > 0 && (
            <div className={cn('p-2', (results.patients.length > 0 || results.transcripts.length > 0) && 'border-t')}>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Documents
              </div>
              {results.documents.map((doc) => {
                const flatIndex = getFlatIndex('document', doc.id);
                return (
                  <button
                    key={doc.id}
                    data-testid="global-search-item-document"
                    data-search-item
                    onClick={() => handleNavigate({ type: 'document', id: doc.id, data: doc })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      flatIndex === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <HighlightText text={doc.title} query={query} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {doc.patient_name}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(doc.created_at), 'dd MMM', { locale: fr })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tasks Section */}
          {results.tasks.length > 0 && (
            <div className={cn(
              'p-2', 
              (results.patients.length > 0 || results.transcripts.length > 0 || results.documents.length > 0) && 'border-t'
            )}>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tâches
              </div>
              {results.tasks.map((task) => {
                const flatIndex = getFlatIndex('task', task.id);
                return (
                  <button
                    key={task.id}
                    data-testid="global-search-item-task"
                    data-search-item
                    onClick={() => handleNavigate({ type: 'task', id: task.id, data: task })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      flatIndex === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <HighlightText text={task.title} query={query} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {task.patient_name || 'Sans patient'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Inbox Section */}
          {results.inbox.length > 0 && (
            <div className={cn(
              'p-2',
              (results.patients.length > 0 || results.transcripts.length > 0 || results.documents.length > 0 || results.tasks.length > 0) && 'border-t'
            )}>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Messages
              </div>
              {results.inbox.map((message) => {
                const flatIndex = getFlatIndex('inbox', message.id);
                return (
                  <button
                    key={message.id}
                    data-testid="global-search-item-inbox"
                    data-search-item
                    onClick={() => handleNavigate({ type: 'inbox', id: message.id, data: message })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      flatIndex === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <InboxIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <HighlightText 
                          text={message.sender_phone || 'Expéditeur inconnu'} 
                          query={query} 
                        />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        <HighlightText 
                          text={message.text_body?.substring(0, 60) || 'Message média'} 
                          query={query} 
                        />
                        {message.text_body && message.text_body.length > 60 ? '...' : ''}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(message.created_at), 'dd MMM', { locale: fr })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Keyboard hint */}
          {hasResults && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↵</kbd>
                ouvrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">esc</kbd>
                fermer
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
