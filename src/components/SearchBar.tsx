// @ts-nocheck
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { fetchProducts, Product } from '@/lib/api-storefront';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchBar = ({ isOpen, onClose }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      setLoading(true);
      try {
        const data = await fetchProducts({ search: searchTerm, limit: 10 });
        setSearchResults(data || []);
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    onClose();
  };

  const getProductImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return '/placeholder.svg';
    const imageIndex = product.cover_image_index ?? 0;
    return product.images[imageIndex] || product.images[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Products</DialogTitle>
          <DialogDescription>Search for sarees and other products</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col">
          {/* Search Header */}
          <div className="flex items-center gap-2 p-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for sarees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base flex-1"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {loading && (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            )}

            {!loading && searchTerm && searchResults.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No products found for "{searchTerm}"
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="p-2">
                {searchResults.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${encodeURIComponent(product.name)}`}
                    onClick={handleClose}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-muted-foreground text-sm">₹{product.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!searchTerm && (
              <div className="p-4 text-center text-muted-foreground">
                Start typing to search for products...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchBar;
