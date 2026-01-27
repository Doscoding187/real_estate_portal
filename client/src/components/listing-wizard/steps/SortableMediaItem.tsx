import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Video, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaFile } from '@/../../shared/listing-types';

interface SortableMediaItemProps {
  media: MediaFile;
  index: number;
  onRemove: (index: number) => void;
  onSetPrimary: (id: string) => void;
}

export const SortableMediaItem: React.FC<SortableMediaItemProps> = ({
  media,
  index,
  onRemove,
  onSetPrimary,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: media.id || String(index),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group w-full"
    >
      <div
        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
          media.isPrimary ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
        } shadow-sm bg-white`}
      >
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt={`Uploaded ${media.fileName}`}
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Video className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Drag Handle */}
        <div className="absolute top-2 left-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded p-1.5 shadow-lg cursor-grab active:cursor-grabbing touch-none z-10">
          <GripVertical className="h-4 w-4 pointer-events-none" />
        </div>

        {/* Remove Button */}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={e => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Primary Badge */}
        {media.isPrimary && (
          <div className="absolute top-2 right-12 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none z-10">
            Primary
          </div>
        )}
      </div>

      {/* Set Primary Button */}
      {!media.isPrimary && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={e => {
            e.stopPropagation();
            media.id && onSetPrimary(media.id);
          }}
          className="w-full mt-2 text-xs"
        >
          Set as Primary
        </Button>
      )}
    </div>
  );
};
