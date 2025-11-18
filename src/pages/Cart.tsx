import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Heart, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/components/CartProvider';
import { useWishlist } from '@/components/WishlistProvider';
import { Badge } from '@/components/ui/badge';
import { fetchProductById } from '@/lib/api-storefront';
import { getColorStock, isColorInStock, getSafeImageUrl } from '@/lib/utils';
import { getColorName } from '@/lib/colorUtils';

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const { addToWishlist } = useWishlist();
  const [stockValidation, setStockValidation] = useState<{[key: string]: {inStock: boolean, availableStock: number}}>({});
  const [isValidatingStock, setIsValidatingStock] = useState(false);

  // Validate stock for all cart items
  useEffect(() => {
    const validateStock = async () => {
      if (items.length === 0) return;
      
      setIsValidatingStock(true);
      const validation: {[key: string]: {inStock: boolean, availableStock: number}} = {};
      
      try {
        // Get unique product IDs
        const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))];
        
        // Fetch current product data for each product
        const productPromises = productIds.map(id => fetchProductById(id));
        const products = await Promise.all(productPromises);
        
        // Validate each cart item
        items.forEach(item => {
          const product = products.find(p => p?.id === item.productId);
          if (product) {
            const availableStock = getColorStock(product, item.color);
            const inStock = isColorInStock(product, item.color) && item.quantity <= availableStock;
            validation[item.id] = { inStock, availableStock };
          } else {
            // Product not found - consider it out of stock
            validation[item.id] = { inStock: false, availableStock: 0 };
          }
        });
        
        setStockValidation(validation);
      } catch (error) {
        
        // In case of error, mark all items as potentially problematic
        items.forEach(item => {
          validation[item.id] = { inStock: false, availableStock: 0 };
        });
        setStockValidation(validation);
      } finally {
        setIsValidatingStock(false);
      }
    };

    validateStock();
  }, [items]);

  const handleMoveToWishlist = (item: any) => {
    addToWishlist({
      id: item.productId,
      name: item.name,
      price: item.price,
      images: [item.image],
      sku: item.sku
    });
    removeFromCart(item.id);
  };

  const calculateTotal = () => {
    const subtotal = getTotalPrice();
    const totalSavings = items.reduce((savings, item) => {
      if (item.appliedOffer && item.originalPrice && item.originalPrice > item.price) {
        return savings + ((item.originalPrice - item.price) * item.quantity);
      }
      return savings;
    }, 0);
    
    return {
      subtotal,
      totalSavings,
      total: subtotal
    };
  };

  const { subtotal, totalSavings, total } = calculateTotal();
  
  // Check if checkout is allowed (all items in stock)
  const hasOutOfStockItems = Object.values(stockValidation).some(v => !v.inStock);
  const canCheckout = !hasOutOfStockItems && !isValidatingStock;

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8 font-coolvetica">Add some beautiful sarees to get started</p>
            <Link to="/collections">
              <Button size="lg">Continue Shopping</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-6">
              Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h1>
            
            <div className="space-y-4">
              {items.map((item) => {
                const validation = stockValidation[item.id];
                const isOutOfStock = validation && !validation.inStock;
                const availableStock = validation?.availableStock || 0;
                
                return (
                  <Card key={item.id} className={isOutOfStock ? 'border-red-200 bg-red-50/50' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img
                            src={getSafeImageUrl(item.image)}
                            alt={item.name}
                            className={`w-24 h-24 object-cover object-center rounded ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-medium mb-1 ${isOutOfStock ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {item.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2 font-coolvetica">Color: {getColorName(item.color)}</p>
                          {item.size && (
                            <p className="text-sm text-muted-foreground mb-2 font-coolvetica">Size: <span className="font-medium text-green-600">{item.size}</span></p>
                          )}
                          <p className="text-sm text-muted-foreground mb-2 font-coolvetica">SKU: {item.sku}</p>
                          
                          {/* Stock Warning */}
                          {isOutOfStock && (
                            <div className="flex items-center gap-2 mb-2 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                  {availableStock === 0 ? 'This item is currently sold out' : 'Limited availability'}
                                </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={isOutOfStock || (validation && item.quantity >= validation.availableStock)}
                                className="h-8 w-8"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveToWishlist(item)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Heart className="h-4 w-4 mr-1" />
                              Move to Wishlist
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isOutOfStock ? 'text-muted-foreground' : 'text-primary'}`}>
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground font-coolvetica">
                            ₹{item.price.toLocaleString()} each
                          </p>
                          {/* Show offer information if applicable */}
                          {item.appliedOffer && item.originalPrice && item.originalPrice > item.price && (
                            <div className="text-sm text-green-600 mt-1">
                              <p className="font-medium">🎯 {item.appliedOffer.title}</p>
                              <p>Save ₹{((item.originalPrice - item.price) * item.quantity).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>You save:</span>
                      <span>-₹{totalSavings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-600">
                    <span>Delivery:</span>
                    <span>FREE</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                    {totalSavings > 0 && (
                      <p className="text-sm text-green-600 text-right mt-1">
                        You save ₹{totalSavings.toLocaleString()} with offers!
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {hasOutOfStockItems && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Some items in your cart are out of stock. Please remove them to continue.
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                    disabled={!canCheckout || import.meta.env.VITE_DISABLE_PAYMENTS}
                    title={import.meta.env.VITE_DISABLE_PAYMENTS ? 'Payments are currently on hold' : undefined}
                  >
                    {isValidatingStock ? 'Checking Stock...' : (import.meta.env.VITE_DISABLE_PAYMENTS ? 'Payments On Hold' : 'Proceed to Checkout')}
                  </Button>
                  
                  <Link to="/collections" className="block">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Free shipping on all orders</p>
                  <p>• No Return & No Exchange</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
