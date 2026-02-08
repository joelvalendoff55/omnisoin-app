import { useState, useEffect } from 'react';
import { SystemPrompt, PromptVersion } from '@/lib/prompts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Send, RotateCcw } from 'lucide-react';

interface PromptEditorProps {
  prompt: SystemPrompt;
  currentVersion: PromptVersion | null;
  publishedVersion: PromptVersion | null;
  onSave: (content: string, notes: string | null) => Promise<void>;
  onPublish: (versionId: string) => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
}

export function PromptEditor({
  prompt,
  currentVersion,
  publishedVersion,
  onSave,
  onPublish,
  isSaving,
  isPublishing,
}: PromptEditorProps) {
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize content from current version or published version
  useEffect(() => {
    const initialContent = currentVersion?.content || publishedVersion?.content || '';
    setContent(initialContent);
    setNotes('');
    setHasChanges(false);
  }, [currentVersion, publishedVersion, prompt.id]);

  const handleContentChange = (value: string) => {
    setContent(value);
    const originalContent = currentVersion?.content || publishedVersion?.content || '';
    setHasChanges(value !== originalContent);
  };

  const handleSave = async () => {
    await onSave(content, notes || null);
    setNotes('');
    setHasChanges(false);
  };

  const handlePublish = async () => {
    if (currentVersion) {
      await onPublish(currentVersion.id);
    }
  };

  const handleReset = () => {
    const originalContent = currentVersion?.content || publishedVersion?.content || '';
    setContent(originalContent);
    setNotes('');
    setHasChanges(false);
  };

  const canPublish = currentVersion && !currentVersion.is_published;

  return (
    <Card className="flex flex-col h-full" data-testid="prompt-editor">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{prompt.display_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {prompt.description || 'Aucune description'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentVersion && (
              <Badge variant={currentVersion.is_published ? 'default' : 'secondary'}>
                v{currentVersion.version}
                {currentVersion.is_published && ' (publié)'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Content editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <Label htmlFor="prompt-content" className="mb-2">
            Contenu du prompt
          </Label>
          <Textarea
            id="prompt-content"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Entrez le contenu du prompt..."
            className="flex-1 font-mono text-sm resize-none"
            data-testid="prompt-content-input"
          />
        </div>

        {/* Version notes */}
        <div>
          <Label htmlFor="version-notes" className="mb-2">
            Notes de version
          </Label>
          <Input
            id="version-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Décrivez les changements..."
            data-testid="version-notes-input"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
            data-testid="reset-button"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Annuler
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              data-testid="save-draft-button"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Enregistrement...' : 'Sauvegarder brouillon'}
            </Button>

            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
              data-testid="publish-button"
            >
              <Send className="h-4 w-4 mr-1" />
              {isPublishing ? 'Publication...' : 'Publier'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
