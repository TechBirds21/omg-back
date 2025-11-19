import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getSafeImageUrl } from '@/lib/utils';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku: string;
  currentImage?: string; // Store the original currentImage for debugging
}

interface WishlistContextType {
  items: WishlistItem[];
  addToWishlist: (product: any) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  getTotalItems: () => number;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const { toast } = useToast();

  // Clear wishlist on mount to start empty each session
  useEffect(() => {
    localStorage.removeItem('omaguva-wishlist');
    setItems([]);
  }, []);

  // Save wishlist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('omaguva-wishlist', JSON.stringify(items));
  }, [items]);

  const addToWishlist = (product: any) => {
    const existingItem = items.find(item => item.id === product.id);

    if (existingItem) {
      toast({
        title: "Already in Wishlist",
        description: `${product.name} is already in your wishlist.`,
      });
      return;
    }

    // Get the current image URL - prioritize currentImage, then image (for partial objects), then images array
    const imageUrl = product.currentImage || product.image || product.images?.[0] || '';
    const safeImageUrl = getSafeImageUrl(imageUrl);

    // Adding to wishlist optimized

    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      image: safeImageUrl,
      sku: product.sku,
      currentImage: product.currentImage || product.image // Store the original currentImage or image for debugging
    };

    setItems(prevItems => [...prevItems, newItem]);

    toast({
      title: "Added to Wishlist",
      description: `${product.name} added to wishlist.`,
    });
  };

  const removeFromWishlist = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    toast({
      title: "Removed from Wishlist",
      description: "Item removed from wishlist.",
    });
  };

  const isInWishlist = (id: string) => {
    return items.some(item => item.id === id);
  };

  const getTotalItems = () => {
    return items.length;
  };

  const clearWishlist = () => {
    setItems([]);
    toast({
      title: "Wishlist Cleared",
      description: "All items removed from wishlist.",
    });
  };

  return (
    <WishlistContext.Provider value={{
      items,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      getTotalItems,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};
