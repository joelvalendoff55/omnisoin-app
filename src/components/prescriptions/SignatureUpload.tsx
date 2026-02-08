import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Trash2, Loader2, Pen, Image as ImageIcon } from 'lucide-react';
import { useSignature } from '@/hooks/usePrescriptions';
import { toast } from 'sonner';

export function SignatureUpload() {
  const { signatureUrl, isLoading, uploadSignature, isUploading } = useSignature();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    uploadSignature(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const currentUrl = previewUrl || signatureUrl;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Signature électronique</Label>
      
      {currentUrl ? (
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="relative bg-white rounded-lg p-4 border flex items-center justify-center min-h-[100px]">
              <img
                src={currentUrl}
                alt="Signature"
                className="max-h-[80px] object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Remplacer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Pen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Ajouter votre signature</p>
            <p className="text-sm text-muted-foreground">
              Glissez une image ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PNG ou JPG, max 2MB
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
