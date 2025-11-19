import { useState, useEffect, useRef } from 'react';
import { Menu, X, Heart, ShoppingBag, MessageCircle, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCart } from '@/components/CartProvider';
import { useWishlist } from '@/components/WishlistProvider';
import SearchBar from '@/components/SearchBar';
import { fetchSettings } from '@/lib/api-storefront';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(import.meta.env.VITE_DEFAULT_LOGO_URL || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80');
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const { getTotalItems, attemptedPurchases, restoreAttemptedPurchase, clearAttemptedPurchases } = useCart();
  const { getTotalItems: getWishlistItems } = useWishlist();

  // Scroll detection for header - keep visible but compact
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show header, just make it compact when scrolled
      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch logo from backend settings
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await fetchSettings();
        console.log('Settings received in Header:', settings);
        
        // Handle different response structures
        let brand = (settings as any)?.brand;
        if (!brand && settings) {
          // Try direct access if brand is at root level
          brand = settings.brand;
        }
        
        console.log('Brand data:', brand);
        if (brand && typeof brand === 'object' && brand.logo_url) {
          console.log('Setting logo URL:', brand.logo_url);
          setLogoUrl(brand.logo_url);
        } else {
          // Try to get from seo.default_image as fallback
          const seo = (settings as any)?.seo;
          if (seo?.default_image) {
            console.log('Using SEO default image as logo:', seo.default_image);
            setLogoUrl(seo.default_image);
          } else {
            console.warn('No logo_url found in brand settings');
          }
        }
      } catch (error) {
        console.warn('Failed to load logo from settings:', error);
      }
    };
    loadLogo();
  }, []);

  const navItems = [
    { name: 'HOME', href: '/' },
    { name: 'NEW COLLECTIONS', href: '/new-collections' },
    { name: 'COLLECTIONS', href: '/collections' },
    { name: 'BEST SELLERS', href: '/best-sellers' },
    { name: 'OFFERS', href: '/offers' },
    { name: 'ABOUT', href: '/about' },
    { name: 'CONTACT', href: '/contact' },
  ];

  return (
    <>
      {/* Alert Bar */}
      {showAlert && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-primary text-primary-foreground overflow-hidden">
          <MessageCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between relative">
            <div className="flex items-center w-full overflow-hidden">
              <div className="animate-scroll whitespace-nowrap">
                <span className="inline-block px-4">Free shipping across India on all orders! 🚚</span>
                <span className="inline-block px-4">Outside India? Contact us on WhatsApp for international shipping! 🌍</span>
                <span className="inline-block px-4">24/7 Customer Support Available! 💬</span>
                <span className="inline-block px-4">Premium quality sarees delivered to your doorstep! ✨</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/917680041607"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors flex-shrink-0 z-10"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlert(false)}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6 p-0 flex-shrink-0 z-10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Attempted Purchase Notification */}
      {attemptedPurchases.length > 0 && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 text-amber-900 border-amber-200">
          <Package className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Saved Cart Available!</span>
              <span className="text-sm">You have {attemptedPurchases.length} items from a previous purchase attempt.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={restoreAttemptedPurchase}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Restore Cart
              </Button>
              <Button
                onClick={clearAttemptedPurchases}
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <header 
        className="bg-background border-b border-border sticky top-0 z-50 transition-all duration-300 ease-in-out"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'py-1' : 'py-2'}`}>
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src={logoUrl}
                alt="Omaguva Logo"
                className={`rounded-full object-cover border-2 border-primary shadow-md transition-all duration-300 ${
                  isScrolled ? 'h-16 w-16' : 'h-32 w-32'
                }`}
              />
            </Link>


            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-base font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Icons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/track-order">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Track Order
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="h-5 w-5" />
                  {getWishlistItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {getWishlistItems()}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>

            {/* Mobile Icons + Menu Toggle */}
            <div className="md:hidden flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="h-5 w-5" />
                  {getWishlistItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {getWishlistItems()}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu - Side Drawer */}
          {/* Backdrop */}
          {isMenuOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => setIsMenuOpen(false)}
            />
          )}
          
          {/* Side Drawer */}
          <div 
            className={`md:hidden fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 px-4 py-6">
                <div className="flex flex-col space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-base font-medium text-slate-800 hover:text-primary hover:bg-primary/10 px-4 py-3 rounded-lg transition-all duration-200"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="border-t border-gray-200 my-3"></div>
                  <Link
                    to="/track-order"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 text-base font-medium text-primary hover:bg-primary/10 px-4 py-3 rounded-lg transition-all duration-200"
                  >
                    <Package className="h-5 w-5" />
                    Track Order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Search Modal */}
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
