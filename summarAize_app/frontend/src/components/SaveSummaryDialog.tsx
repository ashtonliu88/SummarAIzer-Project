// src/components/SaveSummaryDialog.tsx
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { libraryApi } from '@/services/api';

interface SaveSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  references?: string[];
  keywords?: string[];
}

const SaveSummaryDialog: React.FC<SaveSummaryDialogProps> = ({
  isOpen,
  onClose,
  summary,
  references = [],
  keywords = []
}) => {
  const [title, setTitle] = useState(`Research Summary ${new Date().toLocaleDateString()}`);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your summary');
      return;
    }

    try {
      setIsSaving(true);
      
      const summaryToSave = {
        id: Date.now().toString(),
        title: title.trim(),
        date_created: new Date().toISOString(),
        summary,
        references,
        keywords
      };
      
      await libraryApi.saveSummary(summaryToSave);
      toast.success('Summary saved to your library!');
      onClose();
    } catch (error) {
      console.error('Error saving summary:', error);
      toast.error('Failed to save summary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Summary to Library</DialogTitle>
          <DialogDescription>
            Give your summary a title before saving it to your personal library.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Size</Label>
            <div className="col-span-3 text-sm text-gray-500">
              {`${summary.length.toLocaleString()} characters`}
            </div>
          </div>
          {keywords.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-0.5">Keywords</Label>
              <div className="col-span-3 flex flex-wrap gap-1">
                {keywords.map((keyword, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Saving...' : 'Save to Library'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveSummaryDialog;
