import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, Category } from '@/lib/api-storefront';
import { ArrowRight } from 'lucide-react';

const CollectionsShowcase = () => {
  const [collections, setCollections] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        setLoading(true);
        const data = await fetchCategories();
        const activeCollections = data.filter(cat => cat.is_active !== false).slice(0, 6);
        setCollections(activeCollections);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-stone-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <div className="h-8 bg-stone-200 rounded w-64 mx-auto animate-pulse mb-4"></div>
            <div className="h-4 bg-stone-100 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-stone-200 aspect-square mb-4"></div>
                <div className="bg-stone-200 h-4 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-stone-50">
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-stone-500 font-light">
            Explore By
          </p>
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 tracking-tight">
            Collections
          </h2>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/collections?category=${encodeURIComponent(collection.name)}`}
              className="group block"
            >
              <div className="space-y-4">
                {/* Collection Image */}
                <div className="relative overflow-hidden bg-stone-100 aspect-square">
                  {collection.image_url ? (
                    <img
                      src={collection.image_url}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-light text-stone-300">
                        {collection.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-stone-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-sm tracking-wider uppercase font-light">
                      Explore
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Collection Name */}
                <div className="text-center">
                  <h3 className="text-sm md:text-base text-stone-900 font-light tracking-wide">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-xs text-stone-500 font-light mt-1 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-sm tracking-wider uppercase text-stone-900 font-light hover:gap-3 transition-all duration-300"
          >
            View All Collections
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CollectionsShowcase;
