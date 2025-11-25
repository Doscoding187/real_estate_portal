import { useEffect, useState } from 'react';
import { Droppable, DroppableProps } from 'react-beautiful-dnd';

/**
 * StrictModeDroppable
 * 
 * A wrapper for react-beautiful-dnd's Droppable that fixes issues with React 18 Strict Mode.
 * In Strict Mode, rbd can fail to initialize correctly because useEffect runs twice.
 * This component delays rendering the Droppable until after the component has mounted.
 */
export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};
