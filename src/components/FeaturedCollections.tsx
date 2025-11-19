import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import { fetchProducts as fetchProductsAPI, Product } from '@/lib/api-storefront';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { isProductSoldOut, getSafeImageUrl } from '@/lib/utils';

const FeaturedCollections = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductsAPI({ limit: 6, featured: true });
        setProducts(data);
      } catch (error) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const productGrid = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return [];
    }

    return products.map((product) => {
      const isSoldOut = isProductSoldOut(product);

      return (
        <Link
          key={product.id}
          to={isSoldOut ? '#' : `/product/${encodeURIComponent(product.name)}`}
          onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
          className="block group"
        >
          <div className="space-y-4">
            {/* Image Container */}
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
                  <span className="text-sm tracking-wider uppercase text-stone-900 font-light">Sold Out</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-2 text-center">
              <h3 className="text-sm text-stone-900 font-light tracking-wide line-clamp-2">
                {product.name}
              </h3>
              <div className="flex items-center justify-center gap-3">
                <span className="text-base text-stone-900 font-light">₹{product.price.toLocaleString()}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-sm text-stone-400 line-through font-light">
                    ₹{product.original_price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      );
    });
  }, [products]);

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <div className="h-8 bg-stone-200 rounded w-64 mx-auto animate-pulse mb-4"></div>
            <div className="h-4 bg-stone-100 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="bg-stone-200 aspect-[3/4]"></div>
                <div className="bg-stone-200 h-4 rounded w-3/4 mx-auto"></div>
                <div className="bg-stone-200 h-4 rounded w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-stone-500 font-light">
            Curated Selection
          </p>
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 tracking-tight">
            Featured Collection
          </h2>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 mb-16">
          {productGrid}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link to="/collections">
            <Button
              variant="outline"
              className="border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-10 py-6 text-sm tracking-wider uppercase font-light transition-all duration-300"
            >
              View All
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;
