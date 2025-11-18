import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { fetchCategories, Category } from '@/lib/api-storefront';
import { Link } from 'react-router-dom';

const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCategories();
        console.log('CategorySection: Fetched categories:', data);
        console.log('CategorySection: Total categories received:', data?.length || 0);
        
        // Show all categories (not just those with images) - let user see all categories
        // Filter only if is_active is explicitly false
        const activeCategories = data.filter(cat => cat.is_active !== false);
        console.log('CategorySection: Active categories:', activeCategories.length);
        
        setCategories(activeCategories);
      } catch (error) {
        console.error('CategorySection: Error fetching categories:', error);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Continuous auto-scroll
  useEffect(() => {
    if (!scrollContainerRef.current || categories.length === 0 || isPaused) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const scrollSpeed = 1; // pixels per frame
    const scrollDelay = 20; // milliseconds between scrolls

    const autoScroll = () => {
      if (scrollContainer) {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        const singleSetWidth = scrollContainer.scrollWidth / 3; // Since we duplicate 3 times
        
        // If we've scrolled past the first set, reset seamlessly
        if (scrollContainer.scrollLeft >= singleSetWidth - 10) {
          scrollContainer.scrollLeft = scrollContainer.scrollLeft - singleSetWidth;
        } else {
          scrollContainer.scrollLeft += scrollSpeed;
        }
      }
    };

    scrollIntervalRef.current = setInterval(autoScroll, scrollDelay);

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [categories.length, isPaused]);

  // Handle manual scroll navigation
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Render category card component
  const renderCategoryCard = (category: Category, uniqueKey: string) => (
    <Link key={uniqueKey} to={`/collections?category=${encodeURIComponent(category.name)}`} className="block group flex-shrink-0">
      <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 bg-white border border-gray-200 w-[280px] md:w-[320px]">
        <div className="relative w-full aspect-[9/16] overflow-hidden bg-gray-100">
          {(() => {
            // Get category image - prefer image_url, then images array, then fallback
            const categoryImage = category.image_url || 
              (category.images && category.images.length > 0 
                ? category.images[category.cover_image_index || 0] || category.images[0]
                : null) ||
              'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg';
            
            return (
              <img 
                src={categoryImage} 
                alt={category.name}
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg';
                }}
              />
            );
          })()}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          {/* Content */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="text-lg md:text-xl font-semibold mb-2">{category.name}</h3>
            <Button 
              className="bg-white text-slate-900 hover:bg-slate-50 border-0 rounded text-xs md:text-sm font-medium px-3 md:px-4 py-1.5 md:py-2 shadow-sm transition-all duration-300"
            >
              Explore Now
              <ArrowRight className="ml-1.5 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );

  // Memoize the categories grid to prevent unnecessary re-renders
  const categoriesGrid = useMemo(() => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      console.log('CategorySection: No categories available');
      return [];
    }
    console.log('CategorySection: Rendering', categories.length, 'categories');
    return categories.map((category, index) => 
      renderCategoryCard(category, `${category.id}-${index}`)
    );
  }, [categories]);
  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
              Shop by Category
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm">
              Loading categories...
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide pb-4">
            <div className="flex gap-4 px-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex-shrink-0">
                  <div className="bg-gray-200 rounded-lg aspect-[9/16] w-[280px] md:w-[320px]"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
              Shop by Category
            </h2>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white relative overflow-hidden w-full max-w-full">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 w-full max-w-full">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Shop by Category
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm">
            Explore our diverse collection of sarees, for every occasion
          </p>
        </div>

        {/* Categories Horizontal Scroll with Auto-scroll */}
        <div 
          className="relative w-full overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 hover:shadow-xl"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 hover:shadow-xl"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>

          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide pb-4 w-full"
            style={{ 
              scrollBehavior: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex gap-4 px-2" style={{ width: 'max-content', minWidth: '100%' }}>
              {/* Duplicate categories for seamless infinite loop */}
              {categories.map((category, index) => 
                renderCategoryCard(category, `set1-${category.id}-${index}`)
              )}
              {categories.map((category, index) => 
                renderCategoryCard(category, `set2-${category.id}-${index}`)
              )}
              {categories.map((category, index) => 
                renderCategoryCard(category, `set3-${category.id}-${index}`)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
