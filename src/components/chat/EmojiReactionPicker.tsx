import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🔥', '👏'];

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
}

const EmojiReactionPicker = ({ onSelect }: EmojiReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <SmilePlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        side="top" 
        align="start"
        sideOffset={5}
      >
        <div className="flex gap-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="p-1.5 text-xl hover:bg-secondary rounded-md transition-colors hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiReactionPicker;
