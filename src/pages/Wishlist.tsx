import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWishlist } from '@/components/WishlistProvider';
import { useCart } from '@/components/CartProvider';

const Wishlist = () => {
  const navigate = useNavigate();
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      images: [item.currentImage || item.image],
      sku: item.sku,
      sizes: item.sizes
    }, 'Default', 1, item.currentImage || item.image, undefined, undefined, item.sizes);
    removeFromWishlist(item.id);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Your wishlist is empty</h1>
            <p className="text-muted-foreground mb-8">Save your favorite sarees for later</p>
            <Link to="/collections">
              <Button size="lg">Explore Collections</Button>
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

        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-6">
            My Wishlist ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="group overflow-hidden">
                <div className="relative">
                                    <img
                    src={item.currentImage || item.image}
                    alt={item.name}
                    className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => {
                      
                      
                      
                      e.currentTarget.style.opacity = '1';
                    }}
                    onError={(e) => {
                      
                      
                      
                      // Fallback to a placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      if (target.src !== 'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg') {
                        target.src = 'https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg';
                      }
                    }}
                    style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">SKU: {item.sku}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-primary">₹{item.price.toLocaleString()}</span>
                      {item.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{item.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleAddToCart(item)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    <Link to={`/product/${encodeURIComponent(item.name)}`}>
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wishlist;
