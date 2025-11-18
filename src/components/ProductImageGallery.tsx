// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize, ArrowUp, ArrowDown, ArrowBigLeft, ArrowBigRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSafeImageUrl, getOptimizedImageUrl } from '@/lib/utils';

interface ProductImageGalleryProps {
  product: any;
  selectedColor: string;
  filterByColor?: boolean; // Whether to filter images by selected color
  onImageChange?: (index: number) => void;
  onColorDetected?: (color: string, fromThumbnail?: boolean) => void;
  className?: string;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  product,
  selectedColor,
  filterByColor = false, // Default to false - show all images unless explicitly filtered
  onImageChange,
  onColorDetected,
  className = ''
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [imageMeta, setImageMeta] = useState<{w:number,h:number}|null>(null);

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const lastWheelRef = useRef<number>(0);

  // All images for thumbnails (always show all)
  const allImages: string[] = useMemo(() => {
    if (!product) return [];
    
    // Debug: Log the entire product to see what we're working with
    console.log('🔍 ProductImageGallery - Full product data:', {
      productId: product.id,
      productName: product.name,
      images: product.images,
      color_images: product.color_images,
      colors: product.colors,
      imagesType: Array.isArray(product.images),
      colorImagesType: Array.isArray(product.color_images),
      colorImagesLength: product.color_images ? product.color_images.length : 0
    });
    
    // Get base images
    const baseImages = Array.isArray(product.images) 
      ? product.images.filter((img: any) => img && typeof img === 'string' && img.trim().length > 0)
      : [];
    
    // Get all color images (2D array: color_images[index] = images for colors[index])
    let allColorImages: string[] = [];
    if (product.color_images) {
      if (Array.isArray(product.color_images)) {
        // Check if it's a 2D array or 1D array
        if (product.color_images.length > 0 && Array.isArray(product.color_images[0])) {
          // It's a 2D array - flatten it
          allColorImages = product.color_images
            .flat()
            .filter((img: any) => img && typeof img === 'string' && img.trim().length > 0);
        } else {
          // It might be a 1D array or JSON string - try to parse
          try {
            const parsed = typeof product.color_images === 'string' 
              ? JSON.parse(product.color_images) 
              : product.color_images;
            if (Array.isArray(parsed)) {
              if (parsed.length > 0 && Array.isArray(parsed[0])) {
                allColorImages = parsed.flat().filter((img: any) => img && typeof img === 'string' && img.trim().length > 0);
              } else {
                allColorImages = parsed.filter((img: any) => img && typeof img === 'string' && img.trim().length > 0);
              }
            }
          } catch (e) {
            console.warn('Failed to parse color_images:', e);
          }
        }
      }
    }
    
    // Combine base images and color images
    // Use Set to remove duplicates while preserving order
    const combined = [...baseImages, ...allColorImages];
    const uniqueImages = Array.from(new Set(combined));
    
    // Debug log to verify all images are included
    console.log('📸 ProductImageGallery - Image summary:', {
      baseImagesCount: baseImages.length,
      baseImages: baseImages,
      colorImagesCount: allColorImages.length,
      colorImages: allColorImages,
      totalImages: uniqueImages.length,
      allImages: uniqueImages
    });
    
    return uniqueImages;
  }, [product]);

  // Images to show in main gallery (filtered when color is selected)
  const imagesToShow: string[] = useMemo(() => {
    // If filterByColor is true and a color is selected, show only that color's images
    if (filterByColor && selectedColor && product?.colors && product?.color_images) {
      const colorIndex = product.colors.indexOf(selectedColor);
      if (colorIndex > -1 && product.color_images[colorIndex]?.length > 0) {
        // Return only images for the selected color
        return product.color_images[colorIndex].filter(Boolean);
      }
    }
    
    // Otherwise, show all images
    return allImages;
  }, [product, selectedColor, filterByColor, allImages]);

  // Video is now handled separately in FloatingVideoPlayer component
  // No longer part of the gallery
  const totalMediaCount = imagesToShow.length;
  
  const getActualMediaIndex = useCallback(() => {
    return currentImageIndex;
  }, [currentImageIndex]);

  const actualMediaIndex = getActualMediaIndex();
  const showingVideo = false; // Video is no longer in gallery

  useEffect(() => {
    const node = imageContainerRef.current;
    if (!node) return;

    const wheelHandler = (e: WheelEvent) => {
      if (totalMediaCount <= 1) return;
      e.preventDefault();

      const now = Date.now();
      if (now - lastWheelRef.current < 500) return;

      if (e.deltaY > 0 || e.deltaX > 0) {
        setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
      } else {
        setCurrentImageIndex(prev => (prev - 1 + totalMediaCount) % totalMediaCount);
      }

      lastWheelRef.current = now;
      setIsAutoPlaying(false);
    };

    node.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      node.removeEventListener('wheel', wheelHandler);
    };
  }, [totalMediaCount]);

  // Map each image to its color (for all images, used for thumbnails)
  const imageColorForAllImages = useMemo(() => {
    if (!product) return allImages.map(() => null);
    return allImages.map((img) => {
      if (!product.color_images || !Array.isArray(product.color_images) || !Array.isArray(product.colors)) return null;
      for (let i = 0; i < product.color_images.length; i++) {
        const arr = product.color_images[i] || [];
        if (arr.includes(img)) {
          return product.colors[i] || null;
        }
      }
      return null;
    });
  }, [allImages, product]);

  // Map each image to its color (for filtered gallery)
  const imageColorForIndex = useMemo(() => {
    if (!product) return imagesToShow.map(() => null);
    return imagesToShow.map((img) => {
      if (!product.color_images || !Array.isArray(product.color_images) || !Array.isArray(product.colors)) return null;
      for (let i = 0; i < product.color_images.length; i++) {
        const arr = product.color_images[i] || [];
        if (arr.includes(img)) {
          return product.colors[i] || null;
        }
      }
      return null;
    });
  }, [imagesToShow, product]);

  // When selected color changes from outside, jump to its first image
  useEffect(() => {
    if (selectedColor && product?.colors && product?.color_images) {
      const colorIndex = product.colors.indexOf(selectedColor);
      if (colorIndex > -1 && product.color_images[colorIndex]?.length > 0) {
        const firstImageOfColor = product.color_images[colorIndex][0];
        // Check if this image is in the current imagesToShow array
        const imageIndexInGallery = imagesToShow.indexOf(firstImageOfColor);
        if (imageIndexInGallery > -1) {
          // Image is already in the gallery, just jump to it
          setCurrentImageIndex(imageIndexInGallery);
          const original = getSafeImageUrl(firstImageOfColor);
          const preview = getOptimizedImageUrl(original, 900, 70);
          setIsLoadingImage(true);
          setDisplayUrl(preview);
          const hi = new Image();
          hi.decoding = 'async' as any;
          hi.loading = 'eager' as any;
          hi.src = original;
          hi.onload = () => {
            setDisplayUrl(original);
            setIsLoadingImage(false);
          };
        } else {
          // Image not in gallery yet (because imagesToShow will update), reset to 0
          // The imagesToShow will update and show only this color's images
          setCurrentImageIndex(0);
        }
      }
    }
  }, [selectedColor, product, imagesToShow]);

  // Auto-detect color when image changes and notify parent
  useEffect(() => {
    // Skip color detection if we're showing video
    if (showingVideo) return;
    
    const actualIndex = actualMediaIndex;
    if (actualIndex >= 0 && actualIndex < imageColorForIndex.length) {
      const color = imageColorForIndex[actualIndex];
      // Always notify parent of the color, even if it's the same (to ensure sync)
      if (color && onColorDetected) {
        // Use a small delay to avoid rapid updates during navigation
        const timeoutId = setTimeout(() => {
          onColorDetected(color);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentImageIndex, actualMediaIndex, imageColorForIndex, onColorDetected, showingVideo]);

  // Notify parent about image changes
  useEffect(() => {
    if (onImageChange) {
      onImageChange(currentImageIndex);
    }
  }, [currentImageIndex, onImageChange]);

  // Detect mobile device
  useEffect(() => {
    const checkSizes = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkSizes();
    window.addEventListener('resize', checkSizes);
    return () => window.removeEventListener('resize', checkSizes);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && totalMediaCount > 1 && !showingVideo) {
      autoPlayRef.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
      }, 3000);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, totalMediaCount, showingVideo]);

  // Wheel handler for desktop - only horizontal scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (totalMediaCount <= 1) return;

    const now = Date.now();
    if (now - lastWheelRef.current < 500) return;

    // Only respond to horizontal scrolling
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();

      if (e.deltaX > 0) {
        setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
      } else {
        setCurrentImageIndex(prev => (prev - 1 + totalMediaCount) % totalMediaCount);
      }

      setIsAutoPlaying(false);
    }

    lastWheelRef.current = now;
  }, [totalMediaCount]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
    setIsScrolling(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    const deltaX = Math.abs(touch.clientX - touchStart.x);

    // Only prevent default for horizontal swipes
    if (deltaX > 15 && deltaX > deltaY * 1.5) {
      // This is a horizontal swipe, and we will prevent default in the event listener.
    } else if (deltaY > 15 && deltaY > deltaX) {
      setIsScrolling(true);
    }

    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, [touchStart]);

  useEffect(() => {
    const node = imageContainerRef.current;
    if (!node) return;

    const touchMoveHandler = (e: TouchEvent) => {
      if (!touchStart) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);

      if (deltaX > 15 && deltaX > deltaY * 1.5) {
        e.preventDefault();
      }
    };

    node.addEventListener('touchmove', touchMoveHandler, { passive: false });

    return () => {
      node.removeEventListener('touchmove', touchMoveHandler);
    };
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || totalMediaCount <= 1 || isScrolling) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsScrolling(false);
      return;
    }

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Only process horizontal swipes
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
      } else {
        setCurrentImageIndex(prev => (prev - 1 + totalMediaCount) % totalMediaCount);
      }
      setIsAutoPlaying(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  }, [touchStart, touchEnd, totalMediaCount, isScrolling]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (totalMediaCount === 0) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          setCurrentImageIndex(prev => (prev - 1 + totalMediaCount) % totalMediaCount);
          setIsAutoPlaying(false);
          break;
        case 'ArrowRight':
          setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
          setIsAutoPlaying(false);
          break;
        case ' ':
          e.preventDefault();
          if (!showingVideo) {
            setIsAutoPlaying(prev => !prev);
          }
          break;
        case 'f':
        case 'F':
          setIsFullscreen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [totalMediaCount, showingVideo]);

  // Reset index when images change
  useEffect(() => {
    if (totalMediaCount === 0) {
      setCurrentImageIndex(0);
      return;
    }

    if (currentImageIndex >= totalMediaCount) {
      setCurrentImageIndex(0);
    }
  }, [totalMediaCount]);

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % totalMediaCount);
    setIsAutoPlaying(false);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + totalMediaCount) % totalMediaCount);
    setIsAutoPlaying(false);
  };

  if (totalMediaCount === 0) {
    return (
      <div className={`w-full h-96 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No media available</p>
      </div>
    );
  }

  const currentImage = showingVideo ? null : (imagesToShow[actualMediaIndex] || imagesToShow[0]);

  // Progressive image loading: load an optimized preview first, then swap to full-res
  useEffect(() => {
    if (!currentImage) {
      setDisplayUrl(null);
      return;
    }
    const original = getSafeImageUrl(currentImage);
    const preview = getOptimizedImageUrl(original, 900, 70);
    setIsLoadingImage(true);
    setDisplayUrl(preview);

    // Preload full-res
    const hi = new Image();
    hi.decoding = 'async' as any;
    hi.loading = 'eager' as any;
    hi.src = original;
    hi.onload = () => {
      setImageMeta({ w: (hi as any).naturalWidth || 0, h: (hi as any).naturalHeight || 0 });
      setDisplayUrl(original);
      setIsLoadingImage(false);
    };
    hi.onerror = () => {
      // Keep preview if full-res fails
      setIsLoadingImage(false);
    };

    return () => {
      hi.onload = null;
      hi.onerror = null;
    };
  }, [currentImage]);

  // Prefetch neighbor images (optimized) for faster next/prev
  useEffect(() => {
    if (showingVideo) return; // Don't prefetch when showing video
    
    const neighbors: string[] = [];
    if (imagesToShow.length > 0) {
      const nextIndex = (actualMediaIndex + 1) % imagesToShow.length;
      const prevIndex = (actualMediaIndex - 1 + imagesToShow.length) % imagesToShow.length;
      if (imagesToShow[nextIndex]) neighbors.push(imagesToShow[nextIndex]);
      if (imagesToShow[prevIndex]) neighbors.push(imagesToShow[prevIndex]);
    }
    neighbors.filter(Boolean).forEach((u) => {
      const img = new Image();
      img.decoding = 'async' as any;
      img.src = getOptimizedImageUrl(getSafeImageUrl(u), 800, 70);
    });
  }, [actualMediaIndex, imagesToShow, showingVideo]);

  // Prefetch all images for selected color to speed up browsing that set
  useEffect(() => {
    if (!product?.colors || !product?.color_images || !selectedColor) return;
    const idx = product.colors.findIndex((c: string) => (c||'').toLowerCase() === String(selectedColor).toLowerCase());
    if (idx >= 0 && Array.isArray(product.color_images[idx])) {
      product.color_images[idx].forEach((u: string) => {
        const img = new Image();
        img.decoding = 'async' as any;
        img.src = getOptimizedImageUrl(getSafeImageUrl(u), 900, 70);
      });
    }
  }, [product, selectedColor]);

  const buildSrcSet = (url: string) => {
    const widths = [400, 800, 1200, 1600];
    return widths.map(w => `${getOptimizedImageUrl(url, w, 75)} ${w}w`).join(', ');
  };


  return (
    <div className={`relative ${className}`}>
      {/* Main Image/Video Container */}
      <div 
        ref={imageContainerRef}
        className={`relative overflow-hidden rounded-lg bg-muted ${
          isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-[9/16] w-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <img
            src={displayUrl || getSafeImageUrl(currentImage)}
            srcSet={displayUrl ? undefined : buildSrcSet(getSafeImageUrl(currentImage))}
            sizes={isFullscreen ? '(min-width: 768px) 100vw' : '(min-width: 768px) 70vw, 100vw'}
            alt={`${product?.name} - Image ${currentImageIndex + 1}`}
            className={`${isFullscreen ? 'w-full h-full max-h-screen object-contain' : 'w-full h-full object-cover'} object-center transition-all duration-300 ease-out ${isLoadingImage ? 'opacity-80' : 'opacity-100'}`}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">No image available</p>
          </div>
        )}

        {/* Navigation Buttons */}
        {totalMediaCount > 1 && !isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-all"
              onClick={prevImage}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-all"
              onClick={nextImage}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Mobile Navigation Hints */}
        {isMobile && totalMediaCount > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-2">
            <ArrowBigLeft className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Swipe to navigate</span>
            <ArrowBigRight className="h-3 w-3 text-muted-foreground" />
          </div>
        )}

        {/* Control Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {totalMediaCount > 1 && !showingVideo && (
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            >
              {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* Thumbnail Strip - Always show all images */}
      {allImages.length > 1 && !isMobile && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {/* Image Thumbnails - Show all images */}
          {allImages.map((image, index) => {
            // Find if this image is in the current filtered gallery
            const imageIndexInGallery = imagesToShow.indexOf(image);
            const isCurrentImage = imageIndexInGallery === currentImageIndex && imageIndexInGallery >= 0;
            const isInFilteredGallery = imageIndexInGallery >= 0;
            
            return (
              <button
                key={index}
                onClick={() => {
                  // If image is in filtered gallery, jump to it
                  if (imageIndexInGallery >= 0) {
                    setCurrentImageIndex(imageIndexInGallery);
                  } else {
                    // If image is not in filtered gallery (different color), 
                    // detect its color and update selection
                    const color = imageColorForAllImages[index];
                    if (color && onColorDetected) {
                      // Update color selection - mark as from thumbnail click
                      // This will trigger filterByColor to update
                      onColorDetected(color, true);
                      // The gallery will update to show this color's images
                      // and we'll jump to index 0 (first image of that color)
                      // The useEffect for selectedColor will handle the jump
                    }
                  }
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  isCurrentImage
                    ? 'border-primary ring-2 ring-primary/20'
                    : isInFilteredGallery
                      ? 'border-border hover:border-primary/50'
                      : 'border-border opacity-50 hover:opacity-75'
                }`}
              >
                <img
                  src={getOptimizedImageUrl(getSafeImageUrl(image), 200)}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Dots Indicator */}
      {totalMediaCount > 1 && isMobile && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalMediaCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
