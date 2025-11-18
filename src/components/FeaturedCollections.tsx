import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchProducts, Product } from '@/lib/api-storefront';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { isProductSoldOut, getSafeImageUrl } from '@/lib/utils';

const FeaturedCollections = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProducts({ limit: 6, featured: true });
        setProducts(data);
      } catch (error) {
        
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Memoize the product grid to prevent unnecessary re-renders
  const productGrid = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('FeaturedCollections: No products available');
      return [];
    }
    console.log('FeaturedCollections: Rendering', products.length, 'products');
    return products.map((product) => {
      const isSoldOut = isProductSoldOut(product);

      return (
        <Link
          key={product.id}
          to={isSoldOut ? '#' : `/product/${encodeURIComponent(product.name)}`}
          onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
          className="block w-full max-w-full"
        >
          <Card className={`group overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 w-full max-w-full mobile-safe-card card-container ${isSoldOut ? 'cursor-not-allowed opacity-50' : ''}`}>
            <div className="relative overflow-hidden w-full max-w-full aspect-[9/16] bg-gray-100">
              {/* First Image - Default */}
              <img
                src={getSafeImageUrl(product.images[product.cover_image_index || 0] || product.images[0])}
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
                  !isSoldOut && product.images && product.images.length > 1 
                    ? 'group-hover:opacity-0' 
                    : isSoldOut 
                      ? 'grayscale opacity-40' 
                      : ''
                }`}
                loading="lazy"
                decoding="async"
              />
              {/* Second Image - On Hover (only if 2+ images exist and not sold out) */}
              {!isSoldOut && product.images && product.images.length > 1 && (
                <img
                  src={getSafeImageUrl(product.images[1] || product.images[0])}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  loading="lazy"
                  decoding="async"
                />
              )}

              {/* Badge - Sutisancha Style */}
              {product.featured && !isSoldOut && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="bg-white text-slate-900 px-2 py-1 rounded text-[10px] font-semibold shadow-sm">
                    FEATURED
                  </div>
                </div>
              )}

              {/* Quick Add Button - Sutisancha Style */}
              {!isSoldOut && (
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <Button className="w-full bg-white text-slate-900 hover:bg-slate-50 shadow-md rounded text-sm font-medium py-2">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Add to cart
                  </Button>
                </div>
              )}

              {isSoldOut && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md">
                  <Badge className="text-base font-black px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl rounded-full">
                    SOLD OUT
                  </Badge>
                </div>
              )}
            </div>

            <div className={`p-4 bg-white ${isSoldOut ? 'opacity-50' : ''}`}>
              <h3 className="font-medium text-sm text-slate-800 mb-2 line-clamp-2 group-hover:text-slate-800">{product.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-base text-slate-900">₹{product.price.toLocaleString()}</span>
                {product.original_price && product.original_price > product.price && (
                  <>
                    <span className="text-xs text-slate-500 line-through font-normal">₹{product.original_price.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-green-600 ml-1">
                      {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              {isSoldOut && (
                <Badge className="text-xs bg-red-500 text-white mt-2">Sold Out</Badge>
              )}
            </div>
          </Card>
        </Link>
      );
    });
  }, [products]);
  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
              Featured Collections
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Loading...
            </p>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg mb-4 aspect-[9/16] w-full"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
              Featured Collections
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Featured Collections
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm">
            Discover our irresistible collection of exquisite sarees
          </p>
        </div>

        {/* Products Grid */}
        {productGrid.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6 max-w-full overflow-hidden">
              {productGrid}
            </div>

          {/* View All Button */}
          <div className="text-center mt-8">
            <Link to="/collections">
              <Button size="lg" className="px-6 py-3 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm transition-all duration-300 rounded">
                Explore All Collections
              </Button>
            </Link>
          </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No featured products available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCollections;
