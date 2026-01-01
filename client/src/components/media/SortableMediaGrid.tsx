/**
 * Sortable Media Grid Component
 * 
 * BARE-BONES VERSION: Maximum reliability, minimal features
 * - No DragOverlay (uses default browser drag image)
 * - No custom modifiers
 * - No animations
 * - Reorder only on dragEnd
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  X,
  Star,
  Image as ImageIcon,
  Video,
  FileText,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'floorplan' | 'pdf';
  category?: 'featured' | 'general' | 'amenities' | 'outdoors' | 'videos' | 'photo' | 'floorplan' | 'render' | 'document';
  fileName?: string;
  isPrimary?: boolean;
  displayOrder: number;
}

export interface SortableMediaGridProps {
  media: MediaItem[];
  onReorder: (media: MediaItem[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onPreview?: (id: string) => void;
  className?: string;
}

interface SortableMediaItemProps {
  item: MediaItem;
  onRemove: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onPreview?: (id: string) => void;
}

/**
 * Individual sortable media item - bare bones
 */
const SortableMediaItem: React.FC<SortableMediaItemProps> = ({
  item,
  onRemove,
  onSetPrimary,
  onPreview,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getMediaTypeIcon = () => {
    switch (item.type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'floorplan':
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      default:
        return <ImageIcon className="w-5 h-5" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border-2',
        isDragging ? 'opacity-50 border-blue-500 z-50' : 'border-transparent hover:border-gray-200',
        item.isPrimary && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Media Preview */}
      {item.type === 'image' || item.type === 'floorplan' ? (
        <img
          src={item.url}
          alt={item.fileName || 'Media'}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          muted
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
      )}

      {/* Overlay with actions */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent',
        'opacity-0 group-hover:opacity-100 transition-opacity'
      )}>
        {/* Drag Handle - THIS is where drag starts */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-md cursor-grab active:cursor-grabbing hover:bg-white"
        >
          <GripVertical className="w-4 h-4 text-gray-700" />
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {onPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(item.id)}
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="h-8 w-8 p-0 bg-white/90 hover:bg-red-100"
          >
            <X className="w-4 h-4 text-gray-700" />
          </Button>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 rounded-md text-xs font-medium text-gray-700">
            {getMediaTypeIcon()}
            <span className="capitalize">{item.type}</span>
          </div>

          {onSetPrimary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetPrimary(item.id)}
              className={cn(
                'h-8 px-2 text-xs font-medium',
                item.isPrimary
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              )}
            >
              <Star className={cn('w-3 h-3 mr-1', item.isPrimary && 'fill-current')} />
              {item.isPrimary ? 'Primary' : 'Set Primary'}
            </Button>
          )}
        </div>
      </div>

      {/* Primary Badge (always visible when not hovering) */}
      {item.isPrimary && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-lg group-hover:opacity-0 transition-opacity">
          <Star className="w-3 h-3 fill-current" />
          Primary
        </div>
      )}
    </div>
  );
};

/**
 * Bare-bones Sortable Media Grid - reorder on drop only
 */
export const SortableMediaGrid: React.FC<SortableMediaGridProps> = ({
  media,
  onReorder,
  onRemove,
  onSetPrimary,
  onPreview,
  className,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = media.findIndex(item => item.id === active.id);
      const newIndex = media.findIndex(item => item.id === over.id);

      const reorderedMedia = arrayMove(media, oldIndex, newIndex).map((item, index) => ({
        ...item,
        displayOrder: index,
      }));

      onReorder(reorderedMedia);
    }
  };

  if (media.length === 0) {
    return (
      <div className={cn('text-center py-12 text-gray-500', className)}>
        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No media uploaded yet</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={media.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
          {media.map(item => (
            <SortableMediaItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onSetPrimary={onSetPrimary}
              onPreview={onPreview}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
