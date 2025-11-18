// @ts-nocheck
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getColorStock, isColorInStock, getSafeImageUrl } from '@/lib/utils';
import { fetchOffers } from '@/lib/api-storefront';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number; // For offer pricing
  quantity: number;
  color: string;
  image: string;
  sku: string;
  size?: string; // For dress products
  sizes?: string[]; // For multiple sizes
  appliedOffer?: any; // For offer information
}

interface CartContextType {
  items: CartItem[];
  attemptedPurchases: CartItem[];
  addToCart: (product: any, color: string, quantity: number, selectedImageUrl?: string, offers?: any[], size?: string, sizes?: string[]) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  saveAttemptedPurchase: () => void;
  restoreAttemptedPurchase: () => void;
  clearAttemptedPurchases: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  recalculateOffers: (productId: string, offers: any[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Helper function to calculate offer price based on total quantity of a product
const calculateOfferPrice = (offer: any, totalQuantity: number, originalPrice: number): number => {
  if (!offer || !offer.conditions || offer.conditions.length === 0) {
    return originalPrice;
  }

  // For single product bulk pricing
  if (offer.offer_type === 'single_product_bulk') {
    // Sort tiers by min_quantity descending to find the highest applicable tier
    const sortedTiers = [...offer.conditions].sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity));

    // Find the highest tier that the total quantity qualifies for
    for (const tier of sortedTiers) {
      if (totalQuantity >= Number(tier.min_quantity)) {
        return Number(tier.price);
      }
    }
  }
  // For bundle offers, use the first tier pricing
  else if (offer.offer_type === 'bundle_offer' && offer.conditions[0]) {
    return Number(offer.conditions[0].price);
  }

  // If no offer applies, return original price
  return originalPrice;
};

// Helper function to get total quantity of a product in cart
const getTotalProductQuantity = (items: CartItem[], productId: string): number => {
  return items
    .filter(item => item.productId === productId)
    .reduce((total, item) => total + item.quantity, 0);
};

// Helper function to recalculate offers for all items of a product
const recalculateProductOffers = (items: CartItem[], productId: string, offers: any[]): CartItem[] => {
  const totalQuantity = getTotalProductQuantity(items, productId);

  return items.map(item => {
    if (item.productId !== productId) return item;

    // Find applicable offer based on total quantity
    let bestOffer = null;
    let bestPrice = item.originalPrice || item.price;

    if (offers && offers.length > 0) {
      for (const offer of offers) {
        const offerPrice = calculateOfferPrice(offer, totalQuantity, item.originalPrice || item.price);
        if (offerPrice < bestPrice) {
          bestPrice = offerPrice;
          bestOffer = offer;
        }
      }
    }

    return {
      ...item,
      price: bestPrice,
      appliedOffer: bestOffer
    };
  });
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [attemptedPurchases, setAttemptedPurchases] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Offers cache (active offers only), indexed by lowercase product name
  const offersByProductNameRef = useRef<Record<string, any[]>>({});
  const offersLoadedRef = useRef(false);

  const loadActiveOffers = async () => {
    if (offersLoadedRef.current) return;
    try {
      // Fetch offers from Python backend
      const data = await fetchOffers();
      const byName: Record<string, any[]> = {};
      for (const off of data || []) {
        const names: string[] = Array.isArray(off.applicable_products) ? off.applicable_products : [];
        for (const nm of names) {
          const key = String(nm || '').toLowerCase();
          if (!key) continue;
          byName[key] = byName[key] || [];
          byName[key].push(off);
        }
      }
      offersByProductNameRef.current = byName;
      offersLoadedRef.current = true;
    } catch (error) {
      console.warn('Failed to load offers from backend:', error);
    }
  };

  useEffect(() => { loadActiveOffers(); }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('omaguva-cart');
      const savedAttempts = localStorage.getItem('omaguva-attempted-purchases');
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      }
      
      if (savedAttempts) {
        const parsedAttempts = JSON.parse(savedAttempts);
        setAttemptedPurchases(parsedAttempts);
      }
    } catch (error) {
      
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('omaguva-cart', JSON.stringify(items));
    } catch (error) {
      
    }
  }, [items]);

  // Save attempted purchases to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('omaguva-attempted-purchases', JSON.stringify(attemptedPurchases));
    } catch (error) {
      
    }
  }, [attemptedPurchases]);


  const addToCart = (product: any, color: string, quantity: number, selectedImageUrl?: string, offers?: any[], size?: string, sizes?: string[]) => {
    // Stock validation - check if color is in stock
    if (!isColorInStock(product, color)) {
      toast({
        title: "Out of Stock",
        description: `${product.name} in ${color} is currently sold out.`,
        variant: "destructive",
      });
      return;
    }

    // Check if requested quantity is available
    const availableStock = getColorStock(product, color);
    if (quantity > availableStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} items available for ${product.name} in ${color}.`,
        variant: "destructive",
      });
      return;
    }

    const cartItemId = `${product.id}-${color}`;
    
    // Get the appropriate image for the selected color
    const getImageForColor = (p: any, selectedColor: string): string => {
      const colors: string[] = Array.isArray(p?.colors) ? p.colors : []
      const colorImages: string[][] = Array.isArray(p?.color_images) ? p.color_images : []
      if (colors.length && colorImages.length) {
        const idx = colors.findIndex((c) => (c || '').toLowerCase() === String(selectedColor).toLowerCase())
        if (idx >= 0 && Array.isArray(colorImages[idx]) && colorImages[idx][0]) {
          return colorImages[idx][0]
        }
      }
      if (Array.isArray(p?.images) && p.images[0]) return p.images[0]
      return getSafeImageUrl(undefined)
    };
    
  setItems(prevItems => {
      let updatedItems = [...prevItems];
      const existingItem = updatedItems.find(item => item.id === cartItemId);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        // Check if new total quantity exceeds available stock
        if (newQuantity > availableStock) {
          toast({
            title: "Insufficient Stock",
            description: `Cannot add more items. Only ${availableStock} available, you already have ${existingItem.quantity} in cart.`,
            variant: "destructive",
          });
          return prevItems;
        }
        
        toast({
          title: "Updated Cart",
          description: `Updated ${product.name} quantity in cart.`,
        });
        updatedItems = updatedItems.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        toast({
          title: "Added to Cart",
          description: `${product.name} (${color}) added to cart.`,
        });
        updatedItems = [...updatedItems, {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: Number(product.originalPrice ?? product.original_price ?? product.price),
          quantity,
          color,
          // Use the explicitly selected image if provided, otherwise derive for the color
          image: selectedImageUrl ? getSafeImageUrl(selectedImageUrl) : getSafeImageUrl(getImageForColor(product, color)),
          sku: product.sku,
          size: size,
          sizes: sizes,
          appliedOffer: product.appliedOffer
        }];
      }

      // Recalculate offers for this product based on total quantity
      const nameKey = String(product?.name || '').toLowerCase();
      const cachedOffers = (offers && offers.length > 0) ? offers : (offersByProductNameRef.current[nameKey] || []);
      if (cachedOffers && cachedOffers.length > 0) {
        updatedItems = recalculateProductOffers(updatedItems, product.id, cachedOffers);
      }

      return updatedItems;
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prevItems => {
      const removed = prevItems.find(i => i.id === id)
      const updated = prevItems.filter(item => item.id !== id)
      if (removed) {
        const productId = removed.productId
        // Lookup offers by name for this product id from remaining items (same product name)
        const anyLine = updated.find(i => i.productId === productId)
        const nameKey = anyLine ? String(anyLine.name || '').toLowerCase() : ''
        const cachedOffers = nameKey ? (offersByProductNameRef.current[nameKey] || []) : []
        return cachedOffers.length > 0 ? recalculateProductOffers(updated, productId, cachedOffers) : updated
      }
      return updated
    });
    toast({
      title: "Removed from Cart",
      description: "Item removed from cart.",
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems(prevItems => {
      let updatedItems = prevItems.map(item => {
        if (item.id === id) {
          return { ...item, quantity };
        }
        return item;
      });

      // Recalculate offers for this product based on new total
      const updatedItem = updatedItems.find(item => item.id === id)
      if (updatedItem) {
        const productId = updatedItem.productId
        const nameKey = String(updatedItem.name || '').toLowerCase()
        const cachedOffers = offersByProductNameRef.current[nameKey] || []
        updatedItems = cachedOffers.length > 0 ? recalculateProductOffers(updatedItems, productId, cachedOffers) : updatedItems
      }

      return updatedItems;
    });
  };

  const recalculateOffers = (productId: string, offers: any[]) => {
    setItems(prevItems => recalculateProductOffers(prevItems, productId, offers));
  };

  const clearCart = () => {
    setItems([]);
    toast({
      title: "Cart Cleared",
      description: "All items removed from cart.",
    });
  };

  const saveAttemptedPurchase = () => {
    if (items.length > 0) {
      setAttemptedPurchases([...items]);
      toast({
        title: "Purchase Attempted",
        description: "Your cart has been saved. You can continue shopping or try again.",
      });
    }
  };

  const restoreAttemptedPurchase = () => {
    if (attemptedPurchases.length > 0) {
      setItems([...attemptedPurchases]);
      toast({
        title: "Cart Restored",
        description: "Your previous cart has been restored.",
      });
    }
  };

  const clearAttemptedPurchases = () => {
    setAttemptedPurchases([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      attemptedPurchases,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      saveAttemptedPurchase,
      restoreAttemptedPurchase,
      clearAttemptedPurchases,
      getTotalItems,
      getTotalPrice,
      recalculateOffers
    }}>
      {children}
    </CartContext.Provider>
  );
};
