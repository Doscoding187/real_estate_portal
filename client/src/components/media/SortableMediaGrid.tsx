/**
 * Sortable Media Grid Component
 * 
 * Drag-and-drop media grid with reordering capabilities using @dnd-kit
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
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
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
  fileName?: string;
  isPrimary?: boolean;
  displayOrder: number;
}

export interface SortableMediaGridProps {
  /**
   * Media items to display
   */
  media: MediaItem[];
  
  /**
   * Callback when media order changes
   */
  onReorder: (media: MediaItem[]) => void;
  
  /**
   * Callback when remove button is clicked
   */
  onRemove: (id: string) => void;
  
  /**
   * Callback when set as primary button is clicked
   */
  onSetPrimary?: (id: string) => void;
  
  /**
   * Callback when preview button is clicked
   */
  onPreview?: (id: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

interface SortableMediaItemProps {
  item: MediaItem;
  onRemove: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onPreview?: (id: string) => void;
}

/**
 * Individual sortable media item
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get media type icon
  const getMediaTypeIcon = () => {
    switch (item.type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'floorplan':
        return <FileText className="w-5 h-5" />;
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
        'relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition-all',
        isDragging ? 'opacity-50 border-blue-500 shadow-2xl scale-105 z-50' : 'border-transparent',
        item.isPrimary && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Media Preview */}
      {item.type === 'image' || item.type === 'floorplan' ? (
        <img
          src={item.url}
          alt={item.fileName || 'Media'}
          className="w-full h-full object-cover"
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

      {/* Overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent',
        'opacity-0 group-hover:opacity-100 transition-opacity'
      )}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-md cursor-grab active:cursor-grabbing hover:bg-white transition-colors"
        >
          <GripVertical className="w-4 h-4 text-gray-700" />
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Preview Button */}
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

          {/* Remove Button */}
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
          {/* Media Type Badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 rounded-md text-xs font-medium text-gray-700">
            {getMediaTypeIcon()}
            <span className="capitalize">{item.type}</span>
          </div>

          {/* Set as Primary Button */}
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

      {/* Primary Badge (always visible) */}
      {item.isPrimary && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3 fill-current" />
          Primary
        </div>
      )}
    </div>
  );
};

/**
 * Sortable Media Grid Component
 */
export const SortableMediaGrid: React.FC<SortableMediaGridProps> = ({
  media,
  onReorder,
  onRemove,
  onSetPrimary,
  onPreview,
  className,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8px to minimize cursor offset during drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

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

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get active item for drag overlay
  const activeItem = activeId ? media.find(item => item.id === activeId) : null;

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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
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

      {/* Drag Overlay - follows cursor */}
      <DragOverlay 
        modifiers={[snapCenterToCursor, restrictToWindowEdges]}
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeItem && (
          <div className="aspect-square w-32 rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500 bg-white cursor-grabbing">
            {activeItem.type === 'image' || activeItem.type === 'floorplan' ? (
              <img
                src={activeItem.url}
                alt={activeItem.fileName || 'Media'}
                className="w-full h-full object-cover"
              />
            ) : activeItem.type === 'video' ? (
              <video
                src={activeItem.url}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
