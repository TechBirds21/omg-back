import { useEffect, useRef, useState } from 'react';

interface ScrollVideoPlayerProps {
  videoUrl: string;
  className?: string;
  poster?: string;
}

const ScrollVideoPlayer: React.FC<ScrollVideoPlayerProps> = ({
  videoUrl,
  className = '',
  poster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Intersection Observer for autoplay on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Try to play video when in view - with smooth scroll
            video.play().catch((error) => {
              console.log('Autoplay prevented:', error);
            });
          } else {
            setIsInView(false);
            // Pause video when out of view
            video.pause();
          }
        });
      },
      {
        threshold: 0.3, // Play when 30% visible for better UX
        rootMargin: '50px' // Start loading slightly before visible
      }
    );

    observer.observe(container);

    // Video event handlers
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      // Restart video when it ends (for continuous playback)
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      observer.disconnect();
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  // Smooth scroll behavior for video container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add smooth scroll class
    container.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        className="w-full h-auto"
        loop
        muted
        playsInline
        preload="auto"
        style={{
          scrollBehavior: 'smooth'
        }}
      />
    </div>
  );
};

export default ScrollVideoPlayer;

