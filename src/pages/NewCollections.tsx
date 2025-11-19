// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Search } from 'lucide-react';
// Removed Supabase import - now using Python API
import { useWishlist } from '@/components/WishlistProvider';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';
import { isProductSoldOut, getProductTotalStock } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number | null | undefined;
  images: string[] | null;
  colors: string[];
  cover_image_index: number | null;
  slug?: string | null;
  new_collection_end_date?: string | null;
  description?: string | null;
  sku: string;
  best_seller?: boolean | null;
  best_seller_rank?: number | null;
  care_instructions?: string | null;
  category_id?: string | null;
  color_images?: any;
  color_stock?: any;
  created_at?: string;
  fabric?: string | null;
  featured?: boolean;
  is_active?: boolean;
  new_collection?: boolean;
  new_collection_start_date?: string | null;
  sizes?: string[];
  stock_status?: string | null;
  stretch_variants?: any;
  total_stock?: number | null;
  updated_at?: string;
  vendor_id?: string | null;
}

const NewCollections = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addToWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    fetchNewCollectionProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.colors.some(color => color.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery]);

  const fetchNewCollectionProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { fetchNewArrivals } = await import('@/lib/api-storefront');
      const data = await fetchNewArrivals();
      
      // Process data to handle null values
      const processedData = (data || []).map(product => ({
        ...product,
        images: product.images || [],
        colors: product.colors || [],
        original_price: product.original_price || null,
        cover_image_index: product.cover_image_index || 0,
        slug: product.slug || product.name
      })) as Product[];
      
      setProducts(processedData);
      setFilteredProducts(processedData);
    } catch (error) {
      
      setError('Failed to load new collections. Please try again.');
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
      image: (product.images && product.images.length > 0) ? product.images[product.cover_image_index || 0] : '',
    });
    
    toast({
      title: "Added to Wishlist",
      description: `${product.name} has been added to your wishlist.`,
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">New Arrivals</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              New Collections
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 font-coolvetica">
              Discover our latest handpicked sarees that blend traditional craftsmanship with contemporary elegance.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search new collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted aspect-[9/16] rounded-lg mb-4 w-full"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-medium text-destructive mb-2">
                  Oops! Something went wrong
                </h3>
                <p className="text-muted-foreground mb-6">
                  {error}
                </p>
                <Button onClick={fetchNewCollectionProducts} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {!loading && !error && (
            <>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    {searchQuery ? 'No products found' : 'No new collections available'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search terms.' 
                      : 'New collections will be available soon. Check back later!'
                    }
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="mt-4"
                    >
                      Clear Search
                    </Button>
                  )}
                  {!searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = '/collections'}
                      className="mt-4 ml-4"
                    >
                      Browse All Collections
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-muted-foreground">
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => {
                      const mainImage = (product.images && product.images.length > 0) 
                        ? product.images[product.cover_image_index || 0] 
                        : '';
                      const isInWishlistCheck = isInWishlist(product.id);
                      const isSoldOut = isProductSoldOut(product);
                      
                      return (
                        <Card key={product.id} className={`group overflow-hidden border-0 transition-all duration-300 ${
                          isSoldOut ? 'opacity-60' : 'shadow-md hover:shadow-lg'
                        }`}>
                          <Link 
                            to={`/product/${encodeURIComponent(product.name)}`}
                            className="block"
                          >
                            <div className="relative aspect-[9/16] overflow-hidden">
                              <img
                                src={mainImage}
                                alt={product.name}
                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                  isSoldOut ? 'grayscale' : 'group-hover:scale-105'
                                }`}
                              />
                              
                              {/* Sold Out Badge */}
                              {isSoldOut && (
                                <Badge className="absolute top-3 left-3 bg-red-600">
                                  Sold Out
                                </Badge>
                              )}
                              
                              {/* New Badge */}
                              {!isSoldOut && (
                                <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                                  NEW
                                </Badge>
                              )}
                              
                              {/* Wishlist Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`absolute top-3 right-3 ${
                                  isInWishlistCheck 
                                    ? 'text-red-500 bg-white/90' 
                                    : 'text-muted-foreground bg-white/90 hover:text-red-500'
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

                            <div className="p-4">
                              <h3 className="font-medium text-sm mb-2 line-clamp-2 hover:text-primary transition-colors font-coolvetica">
                                {product.name}
                              </h3>

                              {/* Colors */}
                              {product.colors && product.colors.length > 0 && (
                                <div className="flex gap-1 mb-2">
                                  {product.colors.slice(0, 4).map((color, index) => (
                                    <ColorCircle key={index} color={color} size="sm" />
                                  ))}
                                  {product.colors.length > 4 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      +{product.colors.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Price */}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground font-coolvetica">
                                  ₹{Number(product.price).toLocaleString()}
                                </span>
                                {product.original_price && product.original_price > product.price && (
                                  <span className="text-sm text-muted-foreground line-through font-coolvetica">
                                    ₹{Number(product.original_price).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewCollections;
