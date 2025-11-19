// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, ShoppingCart, Eye, Plus, Minus, Package } from 'lucide-react';
import { fetchOffers, fetchProducts, type Offer as OfferType } from '@/lib/api-storefront';
import { getColorName, ColorCircle } from '@/lib/colorUtils';
import { isProductSoldOut } from '@/lib/utils';
import { useCart } from '@/components/CartProvider';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  conditions: any;
  applicable_products: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  priority: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  images: string[];
  colors: string[];
  color_images?: any;
  color_stock?: any;
  sku: string;
  is_active: boolean;
  featured: boolean;
  best_seller?: boolean;
  fabric?: string;
  care_instructions?: string;
}

interface OfferProduct extends Product {
  selectedQuantity: number;
  selectedColor: string;
  activeOffers: Offer[];
  bestPricing: {
    originalPrice: number;
    discountedPrice: number;
    totalPrice: number;
    savings: number;
    appliedOffer: Offer | undefined;
  };
}

const Offers = () => {
  const navigate = useNavigate();
  const { addToCart: globalAddToCart, items: cartItems, getTotalPrice, getTotalItems } = useCart();
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize best pricing calculation to avoid repeated calculations
  const calculateBestPricing = useCallback((product: Product, offers: Offer[], quantity: number) => {
    const originalPrice = Number(product.price) || 0;
    let bestResult = {
      originalPrice,
      discountedPrice: originalPrice,
      totalPrice: originalPrice * quantity,
      savings: 0,
      appliedOffer: undefined as Offer | undefined
    };

    for (const offer of offers) {
      if (!offer.conditions || offer.conditions.length === 0) continue;

      let applicablePrice = originalPrice;
      let foundApplicableTier = false;

      // For single product bulk pricing
      if (offer.offer_type === 'single_product_bulk') {
        // Sort tiers by min_quantity descending to find the highest applicable tier
        const sortedTiers = [...offer.conditions].sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity));
        
        // Find the highest tier that the quantity qualifies for
        for (const tier of sortedTiers) {
          if (quantity >= Number(tier.min_quantity)) {
            applicablePrice = Number(tier.price);
            foundApplicableTier = true;
            break; // Take the first (highest) qualifying tier
          }
        }
      }
      // For bundle offers, use the first tier pricing
      else if (offer.offer_type === 'bundle_offer' && offer.conditions[0]) {
        applicablePrice = Number(offer.conditions[0].price);
        foundApplicableTier = true;
      }

      if (foundApplicableTier) {
        const totalPrice = applicablePrice * quantity;
        const savings = (originalPrice * quantity) - totalPrice;

        if (savings > bestResult.savings) {
          bestResult = {
            originalPrice,
            discountedPrice: applicablePrice,
            totalPrice,
            savings,
            appliedOffer: offer
          };
        }
      }
    }

    return bestResult;
  }, []);

  // Memoize createOfferProduct to reduce recalculations
  const createOfferProduct = useCallback((product: Product, offers: Offer[]): OfferProduct => {
    // Find offers applicable to this product
    const applicableOffers = offers.filter(offer => 
      offer.applicable_products && offer.applicable_products.includes(product.name)
    );

    const offerProduct: OfferProduct = {
      ...product,
      selectedQuantity: 1,
      selectedColor: (product.colors && Array.isArray(product.colors) && product.colors.length > 0 && typeof product.colors[0] === 'string') ? product.colors[0] : '',
      activeOffers: applicableOffers,
      bestPricing: calculateBestPricing(product, applicableOffers, 1)
    };

    return offerProduct;
  }, [calculateBestPricing]);

  const fetchOffersAndProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch active offers from Python API
      const offersData = await fetchOffers();

      // Get unique product names from all offers
      const productNamesInOffers = [...new Set(
        (offersData || [])
          .filter(offer => offer.applicable_products && offer.applicable_products.length > 0)
          .flatMap(offer => offer.applicable_products)
          .filter((name): name is string => name !== null)
      )];

      

      if (productNamesInOffers.length === 0) {
        
        setOfferProducts([]);
        setOffers([]);
        setIsLoading(false);
        return;
      }

      // Fetch all products and filter by names in offers
      const allProducts = await fetchProducts({});
      const productsData = allProducts.filter(product => 
        productNamesInOffers.includes(product.name)
      );

      setOffers(offersData || []);
      
      // Create offer products with their applicable offers and pricing
      const processedProducts = (productsData as Product[] || []).map(product => 
        createOfferProduct(product, offersData || [])
      );
      
      
      setOfferProducts(processedProducts);
      
    } catch (error) {
      
      // Silent error handling for better performance
    } finally {
      setIsLoading(false);
    }
  }, [createOfferProduct]);

  useEffect(() => {
    fetchOffersAndProducts();
  }, [fetchOffersAndProducts]);

  const updateProductQuantity = (productId: string, newQuantity: number) => {
    setOfferProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === productId) {
          const newPricing = calculateBestPricing(product, product.activeOffers, newQuantity);
          return {
            ...product,
            selectedQuantity: newQuantity,
            bestPricing: newPricing
          };
        }
        return product;
      })
    );
  };

  const updateProductColor = (productId: string, color: string) => {
    setOfferProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId ? { ...product, selectedColor: color } : product
      )
    );
  };

  const addToCart = (product: OfferProduct) => {
    // Create a product object with correct pricing for cart
    const productForCart = {
      ...product,
      price: product.bestPricing.discountedPrice, // Use discounted price as main price
      originalPrice: product.bestPricing.originalPrice, // Store original price
      appliedOffer: product.bestPricing.appliedOffer // Include offer information
    };

    // Use the global cart context to add the product with offer pricing
    globalAddToCart(productForCart, product.selectedColor, product.selectedQuantity, undefined, undefined, undefined, product.sizes);
  };

  const handleProductClick = (productName: string) => {
    navigate(`/product/${encodeURIComponent(productName)}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">
            Exclusive Product Offers
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Special pricing on selected sarees! Get bulk discounts and bundle offers on handpicked products.
          </p>
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Cart Summary</h3>
                  <p className="text-sm text-green-600">{getTotalItems()} items in cart</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-800">
                    ₹{getTotalPrice().toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">
                    View cart for details
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : offerProducts.length > 0 ? (
          <div className="space-y-8">
            {/* Products with Special Offers */}
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
              {offerProducts.map((product) => {
                const pricing = product.bestPricing;
                const primaryImage = product.images && Array.isArray(product.images) && product.images.length > 0 ? String(product.images[0]) : '';
                const hasOffer = pricing.savings > 0;
                const isSoldOut = isProductSoldOut(product);
                
                return (
                  <Card key={product.id} className={`group relative overflow-hidden transition-all duration-300 ${
                    isSoldOut ? 'opacity-60' : 'hover:shadow-lg'
                  }`}>
                    <div className="relative">
                      {/* Product Image */}
                      <div className="aspect-[9/16] overflow-hidden bg-muted/50 relative">
                        {primaryImage ? (
                          <>
                            {/* First Image - Default */}
                            <img
                              src={primaryImage}
                              alt={product.name}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                                !isSoldOut && product.images && product.images.length > 1
                                  ? 'group-hover:opacity-0'
                                  : isSoldOut
                                    ? 'grayscale opacity-60'
                                    : ''
                              }`}
                            />
                            {/* Second Image - On Hover (only if 2+ images exist) */}
                            {!isSoldOut && product.images && product.images.length > 1 && (
                              <img
                                src={String(product.images[1] || product.images[0])}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                              />
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Sold Out Badge */}
                      {isSoldOut && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="destructive" className="bg-red-600">
                            Sold Out
                          </Badge>
                        </div>
                      )}

                       {/* Offer Title Badge */}
                       {!isSoldOut && hasOffer && pricing.appliedOffer && (
                         <div className="absolute top-2 left-2 max-w-[200px]">
                           <Badge className="bg-red-500 text-white font-semibold text-xs px-2 py-1 truncate">
                             {pricing.appliedOffer.title}
                           </Badge>
                         </div>
                       )}

                       {/* Special Offer Type Badge */}
                       {!isSoldOut && product.activeOffers.length > 0 && (
                         <div className="absolute top-2 right-2">
                           <Badge variant="secondary" className="bg-primary text-white text-xs">
                             <Package className="h-3 w-3 mr-1" />
                             Special Offer
                           </Badge>
                         </div>
                       )}

                      {/* Action Buttons */}
                      {!isSoldOut && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleProductClick(product.name)}
                            className="bg-white/90 hover:bg-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Product Name */}
                        <h3 
                          className="font-semibold text-lg leading-tight cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleProductClick(product.name)}
                        >
                          {product.name}
                        </h3>

                        {/* Colors */}
                        {product.colors && Array.isArray(product.colors) && product.colors.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">Colors:</span>
                            <div className="flex flex-wrap gap-1">
                              {product.colors.map((color, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => updateProductColor(product.id, String(color))}
                                  className={`p-1 rounded-full border-2 transition-colors ${
                                    product.selectedColor === color ? 'border-primary' : 'border-transparent'
                                  }`}
                                >
                                  <ColorCircle color={String(color)} size="small" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quantity Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Qty:</span>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateProductQuantity(product.id, Math.max(1, product.selectedQuantity - 1))}
                              disabled={product.selectedQuantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={product.selectedQuantity}
                              onChange={(e) => updateProductQuantity(product.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateProductQuantity(product.id, product.selectedQuantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold text-primary">
                              ₹{pricing.discountedPrice.toLocaleString()}
                              {product.selectedQuantity > 1 && <span className="text-sm"> each</span>}
                            </span>
                            {hasOffer && (
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{pricing.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            Total: ₹{pricing.totalPrice.toLocaleString()}
                          </div>
                          {hasOffer && (
                            <div className="text-sm text-green-600 font-medium">
                              You save ₹{pricing.savings.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Offer Details */}
                        {pricing.appliedOffer && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-primary mb-2">
                              🎯 {pricing.appliedOffer.title}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                              {pricing.appliedOffer.description}
                            </p>
                            {pricing.appliedOffer.conditions && pricing.appliedOffer.conditions.length > 0 && (
                              <div className="space-y-1">
                                {pricing.appliedOffer.conditions.map((tier: any, idx: number) => (
                                  <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                                    <span>{tier.min_quantity}+ pieces</span>
                                    <span>₹{Number(tier.price).toLocaleString()} each</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Add to Cart Button */}
                        <Button
                          onClick={() => addToCart(product)}
                          className="w-full"
                          variant={hasOffer ? "default" : "outline"}
                          disabled={isSoldOut}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {isSoldOut ? 'Sold Out' : 'Add to Cart'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* No Offer Products Card */
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Special Offers Available</h3>
              <p className="text-muted-foreground">
                Check back soon for exclusive offers on selected sarees!
              </p>
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <div className="mt-16 bg-muted/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">How Our Special Offers Work</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Selected Products</h3>
              <p className="text-sm text-muted-foreground">
                Only handpicked sarees qualify for these exclusive offers and bulk pricing
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Quantity Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Buy more of the same product to unlock better per-piece pricing
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Bundle Offers</h3>
              <p className="text-sm text-muted-foreground">
                Special rates when you buy multiple different products together
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
