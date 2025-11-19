import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, fetchProducts, Category, Product } from '@/lib/api-storefront';
import { ArrowRight } from 'lucide-react';
import { isProductSoldOut, getSafeImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CollectionWithProducts {
  category: Category;
  products: Product[];
}

const CollectionsWithProducts = () => {
  const [collections, setCollections] = useState<CollectionWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCollectionsWithProducts = async () => {
      try {
        setLoading(true);

        const categories = await fetchCategories();
        const activeCategories = categories.filter(cat => cat.is_active !== false).slice(0, 3);

        const collectionsData = await Promise.all(
          activeCategories.map(async (category) => {
            const products = await fetchProducts({
              category: category.name,
              limit: 4
            });
            return { category, products };
          })
        );

        setCollections(collectionsData.filter(c => c.products.length > 0));
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollectionsWithProducts();
  }, []);

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-12 lg:px-20">
          <div className="text-center mb-12 md:mb-16">
            <div className="h-8 bg-stone-200 rounded w-64 mx-auto animate-pulse mb-4"></div>
          </div>
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="mb-16 md:mb-20">
              <div className="h-6 bg-stone-200 rounded w-48 mx-auto mb-8 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-stone-200 aspect-[3/4] mb-3"></div>
                    <div className="bg-stone-200 h-3 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-12 lg:px-20">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-stone-500 font-light">
            Shop By
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-stone-900 tracking-tight">
            Collections
          </h2>
        </div>

        {/* Collections */}
        <div className="space-y-16 md:space-y-20">
          {collections.map((collection) => (
            <div key={collection.category.id} className="space-y-8 md:space-y-10">
              {/* Collection Header */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-light text-stone-900 tracking-tight">
                  {collection.category.name}
                </h3>
                {collection.category.description && (
                  <p className="text-sm md:text-base text-stone-500 font-light max-w-2xl mx-auto">
                    {collection.category.description}
                  </p>
                )}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {collection.products.map((product) => {
                  const isSoldOut = isProductSoldOut(product);

                  return (
                    <Link
                      key={product.id}
                      to={isSoldOut ? '#' : `/product/${encodeURIComponent(product.name)}`}
                      onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
                      className="block group"
                    >
                      <div className="space-y-3 md:space-y-4">
                        {/* Product Image */}
                        <div className={`relative overflow-hidden bg-stone-100 aspect-[3/4] ${isSoldOut ? 'opacity-50' : ''}`}>
                          <img
                            src={getSafeImageUrl(product.images[product.cover_image_index || 0] || product.images[0])}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-all duration-700 ${
                              !isSoldOut ? 'group-hover:scale-105' : 'grayscale'
                            }`}
                            loading="lazy"
                          />

                          {isSoldOut && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <span className="text-xs md:text-sm tracking-wider uppercase text-stone-900 font-light">
                                Sold Out
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-1 md:space-y-2 text-center">
                          <h4 className="text-xs md:text-sm text-stone-900 font-light tracking-wide line-clamp-2">
                            {product.name}
                          </h4>
                          <div className="flex items-center justify-center gap-2 md:gap-3">
                            <span className="text-sm md:text-base text-stone-900 font-light">
                              ₹{product.price.toLocaleString()}
                            </span>
                            {product.original_price && product.original_price > product.price && (
                              <span className="text-xs md:text-sm text-stone-400 line-through font-light">
                                ₹{product.original_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* View Collection Link */}
              <div className="text-center pt-4">
                <Link to={`/collections?category=${encodeURIComponent(collection.category.name)}`}>
                  <Button
                    variant="outline"
                    className="border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-6 md:px-10 py-4 md:py-6 text-xs md:text-sm tracking-wider uppercase font-light transition-all duration-300"
                  >
                    View All {collection.category.name}
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All Collections */}
        <div className="text-center mt-16 md:mt-20">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-xs md:text-sm tracking-wider uppercase text-stone-900 font-light hover:gap-3 transition-all duration-300"
          >
            Browse All Collections
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CollectionsWithProducts;
