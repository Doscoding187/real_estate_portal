/**
 * Sortable Media Grid Component
 * 
 * Premium drag-and-drop media grid with Facebook/Instagram-like reordering
 * Features: Live placeholder animations, smooth transitions, centered ghost
 * 
 * Uses pure @dnd-kit transforms for maximum smoothness (no Framer Motion layout conflicts)
 */

import React, { useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
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
 * Individual sortable media item with full-card drag handle
 * Uses pure @dnd-kit transforms for smoother animations
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

  // Pure @dnd-kit transform for smoothest animations
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 120ms ease-out',
    opacity: isDragging ? 0 : 1, // Hide original when dragging
    zIndex: isDragging ? 0 : 1,
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
      {...attributes}
      {...listeners}
      className={cn(
        'relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 cursor-grab active:cursor-grabbing',
        isDragging ? 'border-blue-500' : 'border-transparent hover:border-gray-200',
        item.isPrimary && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Media Preview */}
      {item.type === 'image' || item.type === 'floorplan' ? (
        <img
          src={item.url}
          alt={item.fileName || 'Media'}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-full object-cover pointer-events-none"
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
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
      )}>
        {/* Drag Handle Visual */}
        <div className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-md">
          <GripVertical className="w-4 h-4 text-gray-700" />
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {onPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onPreview(item.id); }}
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
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
              onClick={(e) => { e.stopPropagation(); onSetPrimary(item.id); }}
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
 * Simple throttle function
 */
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

/**
 * Premium Sortable Media Grid with live reordering
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
  // Local state for live preview during drag
  const [items, setItems] = React.useState<MediaItem[]>(media);

  // Sync external media prop changes
  React.useEffect(() => {
    setItems(media);
  }, [media]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Minimal delay for instant drag feel
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Throttled live preview: items shift in real-time (throttled for smooth performance)
  const handleDragOverThrottled = useCallback(
    throttle((event: DragOverEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setItems((currentItems) => {
          const oldIndex = currentItems.findIndex((i) => i.id === active.id);
          const newIndex = currentItems.findIndex((i) => i.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            return arrayMove(currentItems, oldIndex, newIndex);
          }
          return currentItems;
        });
      }
    }, 50), // 50ms throttle for smooth performance
    []
  );

  const handleDragOver = (event: DragOverEvent) => {
    handleDragOverThrottled(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      const reorderedMedia = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        displayOrder: index,
      }));

      setItems(reorderedMedia);
      onReorder(reorderedMedia); // Persist to parent
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setItems(media); // Reset to original order
    setActiveId(null);
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  if (items.length === 0) {
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
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
          {items.map(item => (
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

      {/* Drag Overlay - smooth ghost that follows cursor */}
      <DragOverlay 
        adjustScale={true}
        modifiers={[snapCenterToCursor, restrictToWindowEdges]}
        dropAnimation={{
          duration: 180,
          easing: 'ease-out',
        }}
      >
        {activeItem && (
          <div className="aspect-square w-36 rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500 bg-white cursor-grabbing scale-105">
            {activeItem.type === 'image' || activeItem.type === 'floorplan' ? (
              <img
                src={activeItem.url}
                alt={activeItem.fileName || 'Media'}
                className="w-full h-full object-cover"
                draggable={false}
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
