// @ts-nocheck
import { useState, useEffect } from 'react';
import { Filter, Grid, List, ChevronDown, Search } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchCategories, Product, Category } from '@/lib/api-storefront';
import { isProductSoldOut, isProductLowStock, getSafeImageUrl, getProductTotalStock } from '@/lib/utils';

const Collections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'All';
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync URL with selected category
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || 'All';
    if (categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  // Update URL when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const newSearchParams = new URLSearchParams(searchParams);
    if (category === 'All') {
      newSearchParams.delete('category');
    } else {
      newSearchParams.set('category', category);
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  const categoryNames = ['All', ...categories.map(cat => cat.name)];
  
  // Get current category data for SEO
  const currentCategory = categories.find(cat => cat.name === selectedCategory);
  
  const filteredAndSortedProducts = (() => {
    // First filter by category
    let filtered = selectedCategory === 'All' 
      ? products 
      : products.filter(product => {
        const category = categories.find(cat => cat.id === product.category_id);
        return category?.name === selectedCategory;
      });
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.fabric?.toLowerCase().includes(query) ||
        product.colors?.some(color => color.toLowerCase().includes(query)) ||
        product.sku?.toLowerCase().includes(query)
      );
    }
    
    // Then sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'featured':
        default:
          // Featured items first, then by creation date
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return sorted;
  })();

  // Generate SEO metadata based on category (after filtered products are calculated)
  const getSEOMetadata = () => {
    const baseUrl = 'https://omaguva.com';
    const defaultImage = import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80';
    
    if (selectedCategory === 'All') {
      return {
        title: 'Saree Collections - Premium Handcrafted Sarees | O Maguva',
        description: 'Discover our exquisite range of handcrafted sarees at O Maguva. Premium silk, cotton, and designer sarees with authentic craftsmanship. Free shipping across India.',
        keywords: 'sarees online, silk sarees, cotton sarees, designer sarees, traditional wear, ethnic wear, Indian sarees, handcrafted sarees, premium sarees, omaguva',
        ogImage: defaultImage,
        canonical: `${baseUrl}/collections`,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Saree Collections",
          "description": "Discover our exquisite range of handcrafted sarees",
          "url": `${baseUrl}/collections`,
          "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": filteredAndSortedProducts.length,
            "itemListElement": filteredAndSortedProducts.slice(0, 10).map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.name,
                "url": `${baseUrl}/product/${encodeURIComponent(product.name)}`,
                "image": getSafeImageUrl(product.images[product.cover_image_index || 0] || product.images[0]),
                "offers": {
                  "@type": "Offer",
                  "price": product.price,
                  "priceCurrency": "INR",
                  "availability": isProductSoldOut(product) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
                }
              }
            }))
          }
        }
      };
    }
    
    // Category-specific SEO
    const categoryImage = currentCategory?.image_url || defaultImage;
    const categoryDescription = currentCategory?.description || 
      `Explore our premium collection of ${selectedCategory} sarees at O Maguva. Handcrafted with authentic craftsmanship, featuring exquisite designs and premium quality. Free shipping across India.`;
    
    return {
      title: `${selectedCategory} Sarees - Premium Collection | O Maguva`,
      description: categoryDescription,
      keywords: `${selectedCategory.toLowerCase()} sarees, ${selectedCategory.toLowerCase()} sarees online, premium ${selectedCategory.toLowerCase()} sarees, designer ${selectedCategory.toLowerCase()} sarees, handcrafted ${selectedCategory.toLowerCase()} sarees, omaguva ${selectedCategory.toLowerCase()}`,
      ogImage: categoryImage,
      canonical: `${baseUrl}/collections?category=${encodeURIComponent(selectedCategory)}`,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${selectedCategory} Sarees`,
        "description": categoryDescription,
        "url": `${baseUrl}/collections?category=${encodeURIComponent(selectedCategory)}`,
        "image": categoryImage,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": filteredAndSortedProducts.length,
          "itemListElement": filteredAndSortedProducts.slice(0, 10).map((product, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Product",
              "name": product.name,
              "url": `${baseUrl}/product/${encodeURIComponent(product.name)}`,
              "image": getSafeImageUrl(product.images[product.cover_image_index || 0] || product.images[0]),
              "category": selectedCategory,
              "offers": {
                "@type": "Offer",
                "price": product.price,
                "priceCurrency": "INR",
                "availability": isProductSoldOut(product) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
              }
            }
          }))
        }
      }
    };
  };
  
  const seoMetadata = getSEOMetadata();

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Saree Collections</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Loading...
            </p>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg mb-4 aspect-[9/16] w-full"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Saree Collections</h1>
            <p className="text-muted-foreground text-lg">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{seoMetadata.title}</title>
        <meta name="description" content={seoMetadata.description} />
        <meta name="keywords" content={seoMetadata.keywords} />
        <link rel="canonical" href={seoMetadata.canonical} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoMetadata.canonical} />
        <meta property="og:title" content={seoMetadata.title} />
        <meta property="og:description" content={seoMetadata.description} />
        <meta property="og:image" content={seoMetadata.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="O Maguva" />
        <meta property="og:locale" content="en_IN" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={seoMetadata.canonical} />
        <meta name="twitter:title" content={seoMetadata.title} />
        <meta name="twitter:description" content={seoMetadata.description} />
        <meta name="twitter:image" content={seoMetadata.ogImage} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(seoMetadata.structuredData)}
        </script>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Saree Collections</h1>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            Discover our exquisite range of handcrafted sarees
          </p>
        </div>

        {/* Category Filters - Top */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {categoryNames.map((categoryName) => (
              <button
                key={categoryName}
                onClick={() => handleCategoryChange(categoryName)}
                className={`px-4 py-2 rounded text-sm font-medium transition-all duration-300 ${
                  selectedCategory === categoryName
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {categoryName}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search sarees by name, fabric, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sort and View Options */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-muted-foreground mb-6">
          Showing {filteredAndSortedProducts.length} results
          {searchQuery && (
            <span> for "<strong>{searchQuery}</strong>"</span>
          )}
          {selectedCategory !== 'All' && (
            <span> in <strong>{selectedCategory}</strong></span>
          )}
          {sortBy !== 'featured' && (
            <span> sorted by <strong>
              {sortBy === 'price-low' ? 'Price: Low to High' :
               sortBy === 'price-high' ? 'Price: High to Low' :
               sortBy === 'newest' ? 'Newest' :
               sortBy === 'name-asc' ? 'Name: A to Z' :
               sortBy === 'name-desc' ? 'Name: Z to A' : 'Featured'}
            </strong></span>
          )}
        </p>

        {/* Products Grid */}
        <div className={`grid gap-6 mb-8 ${
          viewMode === 'grid' 
            ? 'grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredAndSortedProducts.map((product) => {
            const isSoldOut = isProductSoldOut(product);
            
            return (
              <Link 
                key={product.id} 
                to={isSoldOut ? "#" : `/product/${encodeURIComponent(product.name)}`}
                className={`group ${isSoldOut ? 'cursor-not-allowed' : ''}`}
                onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
              >
                <div className={`bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
                  !isSoldOut ? 'group-hover:scale-105' : ''
                } ${
                  viewMode === 'list' ? 'flex items-center' : ''
                } relative`}>
                  <div className={`relative overflow-hidden ${
                    viewMode === 'list' ? 'w-48 h-48 flex-shrink-0' : 'aspect-[9/16]'
                  }`}>
                    {/* First Image - Default */}
                    <img
                      src={getSafeImageUrl(product.images[product.cover_image_index || 0] || product.images[0])}
                      alt={product.name}
                      className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
                        !isSoldOut && product.images && product.images.length > 1
                          ? 'group-hover:opacity-0'
                          : isSoldOut
                            ? 'grayscale opacity-60'
                            : ''
                      }`}
                      loading="lazy"
                      decoding="async"
                      onLoad={(e) => e.currentTarget.style.opacity = '1'}
                      style={{ opacity: 1, transition: 'opacity 0.3s ease' }}
                    />
                    {/* Second Image - On Hover (only if 2+ images exist) */}
                    {!isSoldOut && product.images && product.images.length > 1 && (
                      <img
                        src={getSafeImageUrl(product.images[1] || product.images[0])}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    {product.featured && !isSoldOut && (
                      <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                        Featured
                      </Badge>
                    )}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm font-bold px-4 py-2">
                          SOLD OUT
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''} ${isSoldOut ? 'opacity-70' : ''}`}>
                  <p className="text-xs text-muted-foreground mb-1">
                    {categories.find(cat => cat.id === product.category_id)?.name || 'Saree'}
                  </p>
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2 group-hover:text-foreground">
                    {product.name}
                  </h3>
                  {viewMode === 'list' && product.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.original_price && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{product.original_price.toLocaleString()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  {viewMode === 'list' && (
                    <div className="mt-3 flex items-center gap-2">
                      {product.colors.slice(0, 3).map((color, index) => (
                        <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                          {color}
                        </span>
                      ))}
                      {product.colors.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{product.colors.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Stock Status - Show for all products */}
                  <div className={`mt-2 ${viewMode === 'list' ? 'text-right' : ''}`}>
                    {isProductSoldOut(product) ? (
                      <Badge variant="destructive" className="text-xs">
                        Sold Out
                      </Badge>
                    ) : getProductTotalStock(product) < 10 ? (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        Only {getProductTotalStock(product)} left
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-600">
                        In Stock
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>

        {filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? `No products found for "${searchQuery}"` : 'No products found in this category.'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                handleCategoryChange('All');
                setSortBy('featured');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Collections;
