// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { fetchProducts, Product } from '@/lib/api-storefront';
import { useWishlist } from '@/components/WishlistProvider';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';

const NewCollections = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    fetchNewCollectionProducts();
  }, []);

  const fetchNewCollectionProducts = async () => {
    try {
      const data = await fetchProducts({ limit: 8, newCollection: true });
      const today = new Date();
      const filtered = data.filter((product) => {
        if (!product.new_collection) return false;
        if (!product.new_collection_end_date) return true;
        return new Date(product.new_collection_end_date) >= today;
      });
      setProducts(filtered);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = (product: Product) => {
    if (isInWishlist(product.id)) return;
    
    addToWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[product.cover_image_index || 0],
    });
    
    toast({
      title: "Added to Wishlist",
      description: `${product.name} has been added to your wishlist.`,
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              New Collections
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Loading our latest arrivals...
            </p>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted aspect-[9/16] rounded-lg mb-4 w-full"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              New Collections
            </h2>
            <p className="text-muted-foreground">
              No new collections available at the moment. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Fresh Arrivals
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm">
            Discover our latest handpicked sarees
          </p>
        </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6 max-w-full overflow-hidden">
          {products.map((product, index) => {
            const mainImage = product.images[product.cover_image_index || 0];
            const isInWishlistCheck = isInWishlist(product.id);
            
            return (
              <div 
                key={product.id} 
                className="group relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative w-full mobile-safe-card card-container">
                  <Link to={`/product/${encodeURIComponent(product.name)}`} className="block w-full">
                    <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
                      {/* First Image - Default */}
                      <img
                        src={mainImage}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
                          product.images && product.images.length > 1 ? 'group-hover:opacity-0' : ''
                        }`}
                        loading="lazy"
                      />
                      {/* Second Image - On Hover (only if 2+ images exist) */}
                      {product.images && product.images.length > 1 && (
                        <img
                          src={product.images[1]}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                          loading="lazy"
                        />
                      )}
                      
                      
                      {/* Badge - Sutisancha Style */}
                      <div className="absolute top-3 left-3 z-10">
                        <div className="bg-white text-slate-900 px-2 py-1 rounded text-[10px] font-semibold shadow-sm">
                          NEW
                        </div>
                      </div>
                      
                      {/* Wishlist Button - Sutisancha Style */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-3 right-3 z-10 rounded-full transition-all duration-300 ${
                          isInWishlistCheck 
                            ? 'bg-white text-pink-500 shadow-sm' 
                            : 'bg-white/80 text-slate-600 hover:bg-white hover:text-pink-500 shadow-sm'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToWishlist(product);
                        }}
                      >
                        <Heart className={`h-4 w-4 ${isInWishlistCheck ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </Link>

                  <div className="p-4 bg-white">
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 text-slate-800 group-hover:text-slate-800">
                      {product.name}
                    </h3>

                    {/* Price - Sutisancha Style */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base text-slate-900">
                        ₹{Number(product.price).toLocaleString()}
                      </span>
                      {product.original_price && product.original_price > product.price && (
                        <>
                          <span className="text-xs text-slate-500 line-through font-normal">
                            ₹{Number(product.original_price).toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-green-600 ml-1">
                            {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link to="/new-collections">
            <Button size="lg" className="px-6 py-3 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm transition-all duration-300 rounded">
              View All Collections
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewCollections;
