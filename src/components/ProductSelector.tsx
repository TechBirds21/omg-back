import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Grid3x3,
  List,
  Scan,
  Package,
  Tag,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  original_price?: number;
  images?: string[];
  cover_image_index?: number;
  stock?: number;
  category?: string;
  colors?: string[];
  sizes?: string[];
}

interface ProductSelectorProps {
  products: Product[];
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onSelectProduct: (product: Product) => void;
  isLoading?: boolean;
}

const ProductSelector = ({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onSelectProduct,
  isLoading = false
}: ProductSelectorProps) => {
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      setSearchQuery(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search & Filters */}
      <div className="p-4 border-b border-stone-200 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            type="text"
            placeholder="Search products by name, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Barcode Scanner */}
        <form onSubmit={handleBarcodeSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              type="text"
              placeholder="Scan or enter barcode/SKU"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            Go
          </Button>
        </form>

        {/* Category & View Mode */}
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 border border-stone-200 rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 p-0 ${
                viewMode === 'grid' ? 'bg-stone-900' : ''
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 w-8 p-0 ${
                viewMode === 'list' ? 'bg-stone-900' : ''
              }`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-stone-200 aspect-square rounded mb-2"></div>
                <div className="bg-stone-200 h-4 rounded w-3/4 mb-2"></div>
                <div className="bg-stone-200 h-3 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Package className="w-16 h-16 text-stone-300 mb-4" />
            <p className="text-stone-500 font-light">No products found</p>
            <p className="text-sm text-stone-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
                onClick={() => onSelectProduct(product)}
              >
                {/* Product Image */}
                <div className="aspect-square bg-stone-100 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[product.cover_image_index || 0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-stone-300" />
                    </div>
                  )}

                  {/* Stock Badge */}
                  {product.stock !== undefined && (
                    <Badge
                      variant={product.stock > 0 ? 'secondary' : 'destructive'}
                      className="absolute top-2 right-2 text-xs"
                    >
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-stone-900 line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  {product.sku && (
                    <p className="text-xs text-stone-500 mb-2">SKU: {product.sku}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-stone-900">
                      ₹{product.price.toFixed(2)}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs text-stone-400 line-through">
                        ₹{product.original_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow p-3"
                onClick={() => onSelectProduct(product)}
              >
                <div className="flex gap-3">
                  {/* Product Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[product.cover_image_index || 0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-stone-900 truncate">
                      {product.name}
                    </h3>
                    {product.sku && (
                      <p className="text-xs text-stone-500">SKU: {product.sku}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-medium text-stone-900">
                        ₹{product.price.toFixed(2)}
                      </span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{product.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {product.stock !== undefined && (
                      <Badge
                        variant={product.stock > 0 ? 'secondary' : 'destructive'}
                        className="text-xs mt-1"
                      >
                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSelector;
