// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingVideoPlayerProps {
  videoUrl: string;
  productName?: string;
  onClose?: () => void;
}

const FloatingVideoPlayer: React.FC<FloatingVideoPlayerProps> = ({
  videoUrl,
  productName = '',
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount - position on right side
  useEffect(() => {
    const updatePosition = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Smaller size: 120px width for mobile, 180px for desktop
      const containerWidth = viewportWidth < 768 ? 120 : 180;
      const containerHeight = containerWidth * (16 / 9); // Portrait aspect ratio (9:16 = width:height)
      
      // Position on right side, vertically centered
      const initialX = viewportWidth - containerWidth - 20;
      const initialY = Math.max(20, Math.min(position.y || (viewportHeight - containerHeight) / 2, viewportHeight - containerHeight - 20));
      
      setPosition({ x: initialX, y: initialY });
      if (!isInitialized) {
        setIsInitialized(true);
      }
    };

    updatePosition();
    
    // Update position on window resize to prevent getting stuck
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isInitialized, position.y]);

  // Handle drag start (mouse) - allow dragging from anywhere except buttons
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Handle drag start (touch) - allow dragging from anywhere except buttons
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't drag if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Handle drag (mouse and touch)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Faster dragging - update position directly without throttling
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport - recalculate on each move to handle resize
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;
      const containerWidth = containerRef.current?.offsetWidth || (isMobile ? 120 : 180);
      const containerHeight = containerRef.current?.offsetHeight || (isMobile ? 213 : 320);

      const constrainedX = Math.max(10, Math.min(newX, viewportWidth - containerWidth - 10));
      const constrainedY = Math.max(10, Math.min(newY, viewportHeight - containerHeight - 10));

      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      // Faster dragging - update position directly
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;

      // Constrain to viewport - recalculate on each move to handle resize
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;
      const containerWidth = containerRef.current?.offsetWidth || (isMobile ? 120 : 180);
      const containerHeight = containerRef.current?.offsetHeight || (isMobile ? 213 : 320);

      const constrainedX = Math.max(10, Math.min(newX, viewportWidth - containerWidth - 10));
      const constrainedY = Math.max(10, Math.min(newY, viewportHeight - containerHeight - 10));

      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current && !isInitialized.current) {
      videoRef.current.play().catch(() => {
        // Auto-play failed, user interaction required
      });
    }
  }, []);

  if (!videoUrl) return null;

  // Responsive size: smaller on mobile, slightly larger on desktop
  const containerWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? 120 : 180;
  const containerHeight = containerWidth * (16 / 9); // Portrait aspect ratio
  
  // Don't render until initialized to avoid layout shift
  if (!isInitialized) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${containerWidth}px`,
        transform: 'translateZ(0)', // GPU acceleration
        touchAction: 'none' // Prevent default touch behaviors
      }}
    >
      <div 
        className="bg-black rounded-2xl shadow-2xl overflow-hidden cursor-move relative"
        style={{ borderRadius: '16px' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Close button - positioned absolutely on top */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 hover:bg-black/90 text-white cursor-pointer z-20 border-0"
          onClick={(e) => {
            e.stopPropagation();
            if (onClose) {
              onClose();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Video Container - no border, full video */}
        <div 
          className="relative bg-black overflow-hidden"
          style={{ 
            width: '100%',
            aspectRatio: '9/16',
            height: `${containerHeight}px`,
            borderRadius: '16px'
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            onClick={togglePlay}
          />

          {/* Play Button Overlay - Always visible when paused */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-colors">
                <Play className="h-8 w-8 text-black ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Pause indicator on hover */}
          {isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={togglePlay}
            >
              <div className="bg-white/90 rounded-full p-2 shadow-lg">
                <Pause className="h-6 w-6 text-black" fill="currentColor" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingVideoPlayer;

