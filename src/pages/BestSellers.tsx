// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
// Removed Supabase import - now using Python API
import { getColorName } from '@/lib/colorUtils';
import { isProductSoldOut, getProductTotalStock } from '@/lib/utils';
import { Star, ShoppingCart, Heart, TrendingUp } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images: string[];
  cover_image_index: number;
  colors: string[];
  fabric?: string;
  slug: string;
  best_seller_rank?: number;
}

const BestSellers = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBestSellers();
  }, []);

  const fetchBestSellers = async () => {
    try {
      const { fetchBestSellers } = await import('@/lib/api-storefront');
      const data = await fetchBestSellers();
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch best sellers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCoverImage = (product: Product, index?: number) => {
    if (product.images && product.images.length > 0) {
      if (index !== undefined && index < product.images.length) {
        return product.images[index];
      }
      const coverIndex = product.cover_image_index || 0;
      return product.images[coverIndex] || product.images[0];
    }
    return '/placeholder-saree.jpg';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-2 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-serif font-bold text-foreground">
              Best Sellers
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our most popular sarees loved by customers across India. 
            These handpicked favorites combine traditional elegance with contemporary style.
          </p>
        </div>

        {/* Best Sellers Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const isSoldOut = isProductSoldOut(product);
              
              return (
                <Card key={product.id} className={`group overflow-hidden transition-all duration-300 relative ${
                  isSoldOut ? 'opacity-60' : 'hover:shadow-lg'
                }`}>
                  {/* Best Seller Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-yellow-500 text-yellow-900 border-yellow-400">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      #{index + 1} Best Seller
                    </Badge>
                  </div>

                  {/* Sold Out Badge */}
                  {isSoldOut && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="destructive" className="bg-red-600">
                        Sold Out
                      </Badge>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {!isSoldOut && product.original_price && product.original_price > product.price && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="destructive">
                        {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                      </Badge>
                    </div>
                  )}

                <div className="relative overflow-hidden aspect-[9/16] group">
                  {/* First Image - Default */}
                  <img
                    src={getCoverImage(product)}
                    alt={product.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      !isSoldOut && product.images && product.images.length > 1
                        ? 'group-hover:opacity-0'
                        : isSoldOut
                          ? 'grayscale opacity-60'
                          : ''
                    }`}
                    loading="lazy"
                  />
                  {/* Second Image - On Hover (only if 2+ images exist) */}
                  {!isSoldOut && product.images && product.images.length > 1 && (
                    <img
                      src={getCoverImage(product, 1)}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      loading="lazy"
                    />
                  )}
                  
                  {/* Quick Actions */}
                  {!isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 text-black hover:bg-white"
                        asChild
                      >
                        <Link to={`/product/${encodeURIComponent(product.name)}`}>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  {product.fabric && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {product.fabric}
                    </p>
                  )}
                  
                  {product.colors && product.colors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.colors.slice(0, 4).map((color, colorIndex) => (
                        <span
                          key={colorIndex}
                          className="text-xs px-2 py-1 bg-muted rounded-full"
                        >
                          {getColorName(color)}
                        </span>
                      ))}
                      {product.colors.length > 4 && (
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                          +{product.colors.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.original_price)}
                        </span>
                      )}
                    </div>
                    
                    {product.best_seller_rank && (
                      <Badge variant="outline" className="text-xs">
                        Rank #{product.best_seller_rank}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Best Sellers Yet</h3>
              <p className="text-muted-foreground mb-4">
                Our team is working on curating the best sarees for you. Check back soon!
              </p>
              <Button asChild>
                <Link to="/collections">Explore All Collections</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Why These Are Best Sellers */}
        {products.length > 0 && (
          <div className="mt-16 bg-muted/30 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-8">Why These Are Our Best Sellers</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Customer Favorites</h3>
                <p className="text-sm text-muted-foreground">
                  Highly rated and loved by customers across India for their quality and design
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Trending Styles</h3>
                <p className="text-sm text-muted-foreground">
                  The most popular designs that combine traditional craftsmanship with modern appeal
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Frequently Purchased</h3>
                <p className="text-sm text-muted-foreground">
                  Most ordered items with excellent customer satisfaction and repeat purchases
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BestSellers;
