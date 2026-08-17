import React, { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (event: React.SyntheticEvent | TouchEvent | MouseEvent) => void;
  onClick?: (event: React.MouseEvent) => void;
}

export function useLongPress({
  threshold = 420,
  onLongPress,
  onClick,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      isLongPressRef.current = false;

      if ('touches' in event) {
        startPosRef.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      } else {
        startPosRef.current = {
          x: (event as React.MouseEvent).clientX,
          y: (event as React.MouseEvent).clientY,
        };
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        // Trigger subtle haptic feedback if device supports vibration
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(35);
          } catch {
            // Ignore if vibration is disallowed
          }
        }
        onLongPress(event);
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const move = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!timerRef.current) return;

    let currentX = 0;
    let currentY = 0;

    if ('touches' in event) {
      if (event.touches.length === 0) return;
      currentX = event.touches[0].clientX;
      currentY = event.touches[0].clientY;
    } else {
      currentX = (event as React.MouseEvent).clientX;
      currentY = (event as React.MouseEvent).clientY;
    }

    const deltaX = Math.abs(currentX - startPosRef.current.x);
    const deltaY = Math.abs(currentY - startPosRef.current.y);

    // If user scrolled more than 10px, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (isLongPressRef.current) {
        event.preventDefault();
        event.stopPropagation();
        isLongPressRef.current = false;
        return;
      }
      onClick?.(event);
    },
    [onClick]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      onLongPress(event);
    },
    [cancel, onLongPress]
  );

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };
}
