// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Share2,
  Truck,
  RotateCcw,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Package,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useToast } from "@/hooks/use-toast";
import { fetchProductByName, fetchSimilarProducts } from "@/lib/api-storefront";
import { getColorStock, isColorInStock, isProductSoldOut, getProductTotalStock } from "@/lib/utils";
import { ColorCircle, getColorName } from "@/lib/colorUtils";
import ProductImageGallery from "@/components/ProductImageGallery";
import FloatingVideoPlayer from "@/components/FloatingVideoPlayer";

const ProductDetail = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorSelectedByUser, setColorSelectedByUser] = useState(false); // Track if color was manually selected
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedStretchType, setSelectedStretchType] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [showVideoPlayer, setShowVideoPlayer] = useState(true);

  // Helper function to check if product is a dress
  const isDressProduct = () => {
    return product?.color_size_stock && product.color_size_stock.length > 0;
  };

  // Get available sizes for selected color (for dress products)
  const getAvailableSizesForColor = (color: string) => {
    if (!isDressProduct() || !color) return [];
    const colorVariant = product.color_size_stock.find((variant: any) => variant.color === color);
    return colorVariant
      ? colorVariant.sizes.filter((sizeItem: any) => sizeItem.stock > 0).map((sizeItem: any) => sizeItem.size)
      : [];
  };

  // Get stock for specific color and size (for dress products)
  const getStockForColorAndSize = (color: string, size: string) => {
    if (!isDressProduct() || !color || !size) return 0;
    const colorVariant = product.color_size_stock.find((variant: any) => variant.color === color);
    if (!colorVariant) return 0;
    const sizeItem = colorVariant.sizes.find((s: any) => s.size === size);
    return sizeItem ? sizeItem.stock : 0;
  };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<"cart" | "buy">("cart");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (name) {
        try {
          const productData = await fetchProductByName(name);
          console.log('📦 ProductDetail - Received product data:', {
            id: productData?.id,
            name: productData?.name,
            images: productData?.images,
            color_images: productData?.color_images,
            colors: productData?.colors,
            imagesCount: productData?.images?.length || 0,
            colorImagesCount: productData?.color_images?.length || 0
          });
          setProduct(productData);

          // Offers integration pending (after backend migration)
          setOffers([]);

          if (productData) {
            if (productData.colors && productData.colors.length > 0 && productData.colors[0]) {
              // Initialize with first color selected
              setSelectedColors([productData.colors[0]]);
            }
            if (productData.sizes && productData.sizes.length > 0 && productData.sizes[0]) {
              setSelectedSize(productData.sizes[0]);
            }
            if (
              productData.stretch_variants &&
              productData.stretch_variants.length > 0 &&
              productData.stretch_variants[0]
            ) {
              setSelectedStretchType(productData.stretch_variants[0].type);
            }

            try {
              const similar = await fetchSimilarProducts(productData.id);
              setSimilarProducts(similar);
            } catch (error) {
              setSimilarProducts([]);
            }
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load product details.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProduct();
  }, [name, toast]);

  // Reset selections when product changes
  useEffect(() => {
    if (product) {
      // Reset all selections when product changes
      setSelectedColors([]);
      setSelectedSize("");
      setQuantity(1);

      // Auto-select first stretch type if variants exist
      if (product.stretch_variants && product.stretch_variants.length > 0) {
        const firstVariant = product.stretch_variants[0];

        // Check if variant has a valid type, or use a default if type is empty
        if (firstVariant && (firstVariant.type || firstVariant.type === "")) {
          const stretchType = firstVariant.type || "Included"; // Default to 'Included' if type is empty
          setSelectedStretchType(stretchType);
        } else {
          setSelectedStretchType("");
        }
      } else {
        setSelectedStretchType("");
      }
    }
  }, [product]); // Only depend on product to avoid infinite loops

  // Update available sizes when color changes (for dress products)
  useEffect(() => {
    if (isDressProduct() && selectedColors.length > 0) {
      const selectedColor = selectedColors[0];
      const sizes = getAvailableSizesForColor(selectedColor);
      setAvailableSizes(sizes);
      // Reset size selection if current size is not available for selected color
      if (selectedSize && !sizes.includes(selectedSize)) {
        setSelectedSize("");
      }
    } else {
      setAvailableSizes([]);
    }
  }, [selectedColors, product]);

  const imagesToShow = useMemo(() => {
    if (!product) return [];
    const baseImages = product.images || [];
    const allColorImages =
      product.color_images && Array.isArray(product.color_images) ? product.color_images.flat().filter(Boolean) : [];
    const combined = [...baseImages, ...allColorImages];
    return Array.from(new Set(combined.filter(Boolean)));
  }, [product]);

  const handleColorDetected = (color: string, fromThumbnail: boolean = false) => {
    // When image changes to a different color, update the selected color
    // Only update if it's different from current selection to avoid unnecessary re-renders
    if (selectedColors[0] !== color) {
      setSelectedColors([color]);
      // If clicking thumbnail from different color, treat as manual selection
      if (fromThumbnail) {
        setColorSelectedByUser(true);
      }
      // If user hasn't manually selected a color, don't filter images
      // This allows browsing all images while showing which color is currently viewed
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColors([color]); // Only allow one color to be selected at a time
    setColorSelectedByUser(true); // Mark that user manually selected this color
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Check if color is selected
    if (selectedColors.length === 0) {
      toast({
        title: "Please Select Color",
        description: "Please select a color before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    const selectedColor = selectedColors[0];

    // Check if size is selected (if sizes are available)
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Please Select Size",
        description: "Please select a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    // Check if stretch type is selected (if stretch variants are available)
    if (product.stretch_variants && product.stretch_variants.length > 0 && !selectedStretchType) {
      toast({
        title: "Please Select Stretch Type",
        description: "Please select a stretch type before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    // Check if the selected color is in stock
    if (!isColorInStock(product, selectedColor)) {
      toast({
        title: "Out of Stock",
        description: `${product.name} in ${getColorName(selectedColor)} is currently sold out.`,
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setConfirmationAction("cart");
    setModalQuantity(1);
    setShowConfirmationDialog(true);
  };

  const handleConfirmAddToCart = () => {
    if (!product || selectedColors.length === 0) return;

    const selectedColor = selectedColors[0];
    if (!selectedColor) return; // Safety check

    // Get available stock based on product type
    let availableStock: number;
    if (isDressProduct() && selectedSize) {
      availableStock = getStockForColorAndSize(selectedColor, selectedSize);
    } else {
      availableStock = getColorStock(product, selectedColor);
    }

    if (modalQuantity > availableStock) {
      const sizeText = isDressProduct() && selectedSize ? ` in size ${selectedSize}` : "";
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} items available in ${getColorName(selectedColor)}${sizeText}.`,
        variant: "destructive",
      });
      return;
    }

    const imageForCart = imagesToShow[currentImageIndex] || product.images?.[0];

    // Calculate pricing based on modal quantity for accurate offer application
    const pricingForCart = calculatePricingForQuantity(modalQuantity);

    // Add the selected color as a cart item
    const productWithDiscountedPrice = {
      ...product,
      price: pricingForCart.unitPrice,
      originalPrice: pricingForCart.originalPrice,
      appliedOffer: pricingForCart.applicableOffer,
    };

    addToCart(
      productWithDiscountedPrice,
      selectedColor,
      modalQuantity,
      imageForCart,
      offers,
      selectedSize,
      product.sizes,
    );

    // Show success message with all selected options
    const sizeText = selectedSize ? `, Size: ${selectedSize}` : "";
    const stretchText = selectedStretchType ? `, Stretch: ${selectedStretchType}` : "";
    toast({
      title: "Added to Cart",
      description: `${product.name} (${getColorName(selectedColor)}${sizeText}${stretchText}) × ${modalQuantity} added to cart.`,
    });

    // Close the modal
    setShowQuantityModal(false);
  };

  const handleBuyNow = () => {
    if (!product) return;

    // Check if color is selected
    if (selectedColors.length === 0) {
      toast({
        title: "Please Select Color",
        description: "Please select a color before buying.",
        variant: "destructive",
      });
      return;
    }

    const selectedColor = selectedColors[0];

    // Check if size is selected (if sizes are available)
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Please Select Size",
        description: "Please select a size before buying.",
        variant: "destructive",
      });
      return;
    }

    // Check if stretch type is selected (if stretch variants are available)
    if (product.stretch_variants && product.stretch_variants.length > 0 && !selectedStretchType) {
      toast({
        title: "Please Select Stretch Type",
        description: "Please select a stretch type before buying.",
        variant: "destructive",
      });
      return;
    }

    // Check if the selected color is in stock
    if (!isColorInStock(product, selectedColor)) {
      toast({
        title: "Out of Stock",
        description: `${product.name} in ${getColorName(selectedColor)} is currently sold out.`,
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setConfirmationAction("buy");
    setModalQuantity(1);
    setShowConfirmationDialog(true);
  };

  const handleConfirmAction = () => {
    if (!product || selectedColors.length === 0) return;

    const selectedColor = selectedColors[0];
    const imageForCart = imagesToShow[currentImageIndex] || product.images?.[0];

    // Calculate pricing based on modal quantity for accurate offer application
    const pricingForCart = calculatePricingForQuantity(modalQuantity);

    const productWithDiscountedPrice = {
      ...product,
      price: pricingForCart.unitPrice,
      originalPrice: pricingForCart.originalPrice,
      appliedOffer: pricingForCart.applicableOffer,
    };

    // Add to cart
    addToCart(
      productWithDiscountedPrice,
      selectedColor,
      modalQuantity,
      imageForCart,
      offers,
      selectedSize,
      product.sizes,
    );

    // Show success message
    const sizeText = selectedSize ? `, Size: ${selectedSize}` : "";
    const stretchText = selectedStretchType ? `, Stretch: ${selectedStretchType}` : "";
    toast({
      title: "Added to Cart",
      description: `${product.name} (${getColorName(selectedColor)}${sizeText}${stretchText}) × ${modalQuantity} added to cart.`,
    });

    // Close confirmation dialog
    setShowConfirmationDialog(false);

    // If it was a buy now action, navigate to checkout
    if (confirmationAction === "buy") {
      navigate("/checkout");
    }
  };

  const handleAddToWishlist = () => {
    if (!product) return;

    // Use the currently viewed image instead of just the cover photo
    const currentImage = imagesToShow[currentImageIndex] || product.images?.[0];

    const productForWishlist = {
      ...product,
      currentImage: currentImage,
    };

    addToWishlist(productForWishlist);
  };

  const isInWishlistCheck = product ? isInWishlist(product.id) : false;
  const isSoldOut = product ? isProductSoldOut(product) : false;
  const availableStock =
    product && selectedColors.length > 0 && selectedColors[0] ? getColorStock(product, selectedColors[0]) : 0;

  // Check if all required selections are made
  const isAllSelectionsComplete = () => {
    if (!product) return false;

    // Color is always required
    if (selectedColors.length === 0) return false;

    // Size validation based on product type
    if (isDressProduct()) {
      // For dress products, size is required if there are available sizes for the selected color
      if (availableSizes.length > 0 && !selectedSize) return false;
    } else {
      // For regular products, size is required if sizes are available
      if (product.sizes && product.sizes.length > 0 && !selectedSize) return false;
    }

    // Stretch type is required if stretch variants are available
    if (product.stretch_variants && product.stretch_variants.length > 0 && !selectedStretchType) {
      return false;
    }

    return true;
  };

  const canAddToCart = isAllSelectionsComplete() && !isSoldOut;

  // Helper function to calculate pricing for any quantity
  const calculatePricingForQuantity = (qty: number) => {
    if (!product || !offers.length) {
      const basePrice =
        product?.stretch_variants && product.stretch_variants.length > 0 && selectedStretchType
          ? product.stretch_variants.find((v: any) => v.type === selectedStretchType)?.price || product.price
          : product?.price || 0;
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * qty,
        originalPrice: basePrice,
        discountPercentage: 0,
        discountAmount: 0,
        applicableOffer: null,
      };
    }

    const basePrice =
      product.stretch_variants && product.stretch_variants.length > 0 && selectedStretchType
        ? product.stretch_variants.find((v: any) => v.type === selectedStretchType)?.price || product.price
        : product.price;

    let bestOffer = null;
    let bestPrice = basePrice;

    for (const offer of offers) {
      if (!offer.conditions || !Array.isArray(offer.conditions)) continue;

      const applicableTier = offer.conditions
        .filter((condition: any) => qty >= condition.min_quantity)
        .sort((a: any, b: any) => b.min_quantity - a.min_quantity)[0];

      if (applicableTier) {
        const tierPrice = applicableTier.price_per_unit || applicableTier.price;
        if (tierPrice < bestPrice) {
          bestPrice = tierPrice;
          bestOffer = { ...offer, applicableTier };
        }
      }
    }

    return {
      unitPrice: bestPrice,
      totalPrice: bestPrice * qty,
      originalPrice: basePrice,
      discountPercentage: bestOffer ? Math.round(((basePrice - bestPrice) / basePrice) * 100) : 0,
      discountAmount: bestOffer ? basePrice - bestPrice : 0,
      applicableOffer: bestOffer,
    };
  };

  const calculateBestPricing = useMemo(
    () => calculatePricingForQuantity(quantity),
    [product, offers, quantity, selectedStretchType, selectedColors],
  );

  // Calculate pricing for modal quantity
  const modalPricing = useMemo(
    () => calculatePricingForQuantity(modalQuantity),
    [product, offers, modalQuantity, selectedStretchType, selectedColors],
  );

  const currentPrice = calculateBestPricing.unitPrice;

  // Scroll functions for similar products
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Width of one product card + gap
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Width of one product card + gap
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Update scroll buttons when similar products change
  useEffect(() => {
    if (similarProducts.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(updateScrollButtons, 100);
    }
  }, [similarProducts]);

  // Update scroll buttons on window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(updateScrollButtons, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [similarProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-pink-50/20 to-indigo-50/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Skeleton Back Button */}
            <div className="h-6 w-48 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full animate-pulse"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image Gallery Skeleton */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-200/50 to-pink-200/50 h-[600px] rounded-3xl animate-pulse shadow-xl"></div>
                <div className="flex gap-4 overflow-x-auto">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gradient-to-br from-purple-200/50 to-pink-200/50 h-24 w-24 rounded-2xl animate-pulse flex-shrink-0"></div>
                  ))}
                </div>
              </div>
              
              {/* Product Info Skeleton */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-3xl p-8 border-2 border-amber-100 shadow-xl space-y-6">
                  <div className="space-y-3">
                    <div className="h-4 w-32 bg-gradient-to-r from-amber-200 to-rose-200 rounded-full animate-pulse"></div>
                    <div className="h-12 bg-gradient-to-r from-amber-200 to-rose-200 rounded-2xl animate-pulse"></div>
                  </div>
                  <div className="h-20 bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl animate-pulse"></div>
                </div>
                
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-6 border-2 border-amber-100 space-y-4">
                    <div className="h-6 w-40 bg-gradient-to-r from-amber-200 to-rose-200 rounded-full animate-pulse"></div>
                    <div className="h-24 bg-gradient-to-r from-amber-200/50 to-rose-200/50 rounded-xl animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/collections")}>Back to Collections</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/20 to-pink-50/10">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-3 text-slate-600 hover:text-primary mb-8 transition-all duration-300 group font-bold hover:translate-x-[-4px]"
        >
          <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-4px] transition-transform duration-300" />
          Back to Collections
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ProductImageGallery
              product={product}
              selectedColor={selectedColors[0] || ""}
              filterByColor={colorSelectedByUser}
              onImageChange={(index) => setCurrentImageIndex(index)}
              onColorDetected={(color) => handleColorDetected(color)}
              className="w-full"
            />
          </div>

          {/* Floating Video Player - Show dummy video for testing */}
          {product && showVideoPlayer && (
            <FloatingVideoPlayer
              videoUrl={product?.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
              productName={product?.name || 'Product Video'}
              onClose={() => {
                setShowVideoPlayer(false);
              }}
            />
          )}

          <div className="space-y-4">
            {/* Product Header - Sutisancha Style */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3 leading-snug">{product.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">SKU: {product.sku}</span>
                    {isSoldOut ? (
                      <Badge className="bg-red-500 text-white px-2 py-0.5 text-xs font-medium">Sold Out</Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white px-2 py-0.5 text-xs font-medium">In Stock</Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddToWishlist}
                    className={`rounded-full transition-all duration-300 ${
                      isInWishlistCheck 
                        ? "bg-pink-500 text-white shadow-lg scale-110" 
                        : "bg-white/80 hover:bg-pink-500 hover:text-white hover:scale-110 shadow-md"
                    }`}
                  >
                    <Heart className={`h-6 w-6 ${isInWishlistCheck ? "fill-current" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full bg-white/80 hover:bg-primary hover:text-white hover:scale-110 shadow-md transition-all duration-300">
                    <Share2 className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Price Section - Sutisancha Style */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl md:text-3xl font-semibold text-slate-900">₹{currentPrice.toLocaleString()}</span>
                  {calculateBestPricing.discountPercentage > 0 && (
                    <>
                      <span className="text-base text-slate-500 line-through font-normal">
                        ₹{calculateBestPricing.originalPrice.toLocaleString()}
                      </span>
                      <Badge className="bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold border-0">
                        {calculateBestPricing.discountPercentage}% OFF
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {product.description && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-semibold text-slate-900 mb-2">About Product</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                  {product.description}
                </p>
              </div>
            )}

            {product.colors && product.colors.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Colors Available
                  <span className="text-red-500 text-sm ml-1">*</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color: string) => {
                    const colorStock = getColorStock(product, color);
                    const isColorAvailable = isColorInStock(product, color);

                    return (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        disabled={!isColorAvailable}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-300 ${
                          selectedColors.includes(color)
                            ? "border-primary bg-gradient-to-br from-amber-50 to-rose-50 text-primary shadow-md ring-2 ring-primary/20"
                            : isColorAvailable
                              ? "border-primary/30 bg-white hover:border-primary hover:bg-primary/5"
                              : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <ColorCircle color={color} size="w-6 h-6" />
                        <span className="font-semibold text-sm">{getColorName(color)}</span>
                        {!isColorAvailable && <span className="text-[10px] text-red-500 font-medium">(Sold Out)</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Single color selection - Elegant Offers Display */}
                {selectedColors.length === 1 && offers.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                      <span>🎯</span> Available Offers
                    </h4>
                    <div className="space-y-2">
                      {offers.map((offer, index) => {
                        const applicableTier = offer.conditions
                          ?.filter((condition: any) => quantity >= condition.min_quantity)
                          .sort((a: any, b: any) => b.min_quantity - a.min_quantity)[0];

                        if (applicableTier) {
                          const savings =
                            (calculateBestPricing.originalPrice - Number(applicableTier.price)) * quantity;
                          return (
                            <div key={index} className="bg-white/80 rounded-lg p-2.5 border border-green-300">
                              <p className="text-xs font-medium text-green-800">
                                ✅ <span className="text-sm">{offer.title}</span>: Save ₹{savings.toLocaleString()} with {quantity} items!
                              </p>
                            </div>
                          );
                        } else {
                          // Show minimum quantity needed
                          const minQuantity = Math.min(...offer.conditions.map((c: any) => c.min_quantity));
                          const additionalNeeded = minQuantity - quantity;
                          return (
                            <div key={index} className="bg-white/80 rounded-lg p-2.5 border border-amber-300">
                              <p className="text-xs font-medium text-amber-800">
                                ⏳ <span className="text-sm">{offer.title}</span>: Add {additionalNeeded} more item(s) to qualify!
                              </p>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {product.stretch_variants && product.stretch_variants.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Stretch Type
                  <span className="text-red-500 text-sm ml-1">*</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.stretch_variants.map((variant: any) => (
                    <button
                      key={variant.type || "included"}
                      onClick={() => {
                        const stretchType = variant.type || "Included";
                        setSelectedStretchType(stretchType);
                      }}
                      className={`px-4 py-2.5 rounded-lg border-2 transition-all duration-300 ${
                        selectedStretchType === (variant.type || "Included")
                          ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-700 shadow-md ring-2 ring-purple-200"
                          : "border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm capitalize">{variant.type || "Included"}</div>
                        <div className="text-xs font-medium text-slate-600">
                          {variant.price && variant.price > 0 ? `₹${variant.price.toLocaleString()}` : "Included"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {((!isDressProduct() && product.sizes && product.sizes.length > 0) ||
              (isDressProduct() && availableSizes.length > 0)) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Size
                  <span className="text-red-500 text-sm ml-1">*</span>
                  {isDressProduct() && selectedColors.length > 0 && (
                    <span className="text-xs text-slate-600 ml-2">
                      (Available for {getColorName(selectedColors[0])})
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(isDressProduct() ? availableSizes : product.sizes || []).map((size: string) => {
                    const stock =
                      isDressProduct() && selectedColors.length > 0
                        ? getStockForColorAndSize(selectedColors[0], size)
                        : getColorStock(product, selectedColors[0] || "");
                    const isOutOfStock = stock <= 0;

                    return (
                      <button
                        key={size}
                        onClick={() => !isOutOfStock && setSelectedSize(size)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2.5 rounded-lg border-2 transition-all duration-300 font-semibold text-sm ${
                          selectedSize === size
                            ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-700 shadow-md ring-2 ring-purple-200"
                            : isOutOfStock
                              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                              : "border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons - Sutisancha Style */}
            <div className="space-y-2">
              {!isSoldOut && (
                <div className="space-y-2">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded py-3 text-sm font-medium"
                    size="lg"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    {!isAllSelectionsComplete() ? "Please Select Options Above" : "Add to cart"}
                  </Button>

                  <Button
                    onClick={handleBuyNow}
                    disabled={!canAddToCart}
                    className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded py-3 text-sm font-medium"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {!isAllSelectionsComplete() ? "Please Select Options Above" : "Buy Now"}
                  </Button>
                </div>
              )}

              {/* Selection Status Messages - Elegant Design */}
              {!isSoldOut && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200 space-y-1">
                  {selectedColors.length === 0 && (
                    <p className="text-amber-700 text-sm font-medium flex items-center gap-1.5">
                      <span>⚠️</span> Please select a color
                    </p>
                  )}
                  {product.sizes && product.sizes.length > 0 && !selectedSize && (
                    <p className="text-amber-700 text-sm font-medium flex items-center gap-1.5">
                      <span>⚠️</span> Please select a size
                    </p>
                  )}
                  {product.stretch_variants && product.stretch_variants.length > 0 && !selectedStretchType && (
                    <p className="text-amber-700 text-sm font-medium flex items-center gap-1.5">
                      <span>⚠️</span> Please select a stretch type
                    </p>
                  )}
                  {isAllSelectionsComplete() && (
                    <p className="text-green-600 text-sm font-medium flex items-center gap-1.5">
                      <span>✅</span> Ready to add to cart!
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleAddToWishlist}
                variant="outline"
                className="w-full border border-pink-300 hover:bg-pink-50 hover:border-pink-400 rounded-xl py-3 text-sm font-semibold transition-all duration-300"
                size="lg"
                disabled={isInWishlistCheck}
              >
                <Heart className={`h-4 w-4 mr-2 ${isInWishlistCheck ? "fill-current text-pink-500" : ""}`} />
                {isInWishlistCheck ? "Added to Wishlist" : "Add to Wishlist"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-lg p-3 border border-purple-100">
                <h4 className="font-semibold text-slate-800 mb-1 text-sm">Fabric</h4>
                <p className="text-slate-700 text-sm">{product.fabric || "NA"}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-pink-50/30 rounded-lg p-3 border border-pink-100">
                <h4 className="font-semibold text-slate-800 mb-1 text-sm">Care Instructions</h4>
                <p className="text-slate-700 text-sm">
                  {product.care_instructions || product.care || product.careInfo || "NA"}
                </p>
              </div>
            </div>

            {/* Elegant Shipping & Product Information Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-start space-x-2">
                  <div className="bg-gradient-to-br from-green-400 to-emerald-400 rounded-lg p-2">
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-0.5">Free Shipping</p>
                    <p className="text-[10px] font-medium text-green-700">Across India</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-start space-x-2">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg p-2">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-800 mb-0.5">Delivery</p>
                    <p className="text-[10px] font-medium text-purple-700">7-10 days</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-start space-x-2">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg p-2">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">Color Note</p>
                    <p className="text-[10px] font-medium text-amber-700">Slight difference in camera</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-3 border border-rose-200">
                <div className="flex items-start space-x-2">
                  <div className="bg-gradient-to-br from-rose-400 to-pink-400 rounded-lg p-2">
                    <RotateCcw className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rose-800 mb-0.5">No Returns</p>
                    <p className="text-[10px] font-medium text-rose-700">Video required for exchange</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products Section - Elegant Design */}
        {similarProducts.length > 0 && (
          <section className="mt-12 py-8 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-indigo-50/50 rounded-2xl relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/15 to-pink-200/15 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-200/15 to-purple-200/15 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  Similar Products
                </h2>
                <p className="text-slate-600 text-sm">You might also like these products</p>
              </div>

              <div className="relative">
                {/* Left Scroll Button - Premium */}
                {canScrollLeft && (
                  <button
                    onClick={scrollLeft}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-2xl rounded-full p-4 border-0 transition-all duration-300 hover:scale-110 hover:shadow-purple-500/50"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}

                {/* Right Scroll Button - Premium */}
                {canScrollRight && (
                  <button
                    onClick={scrollRight}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-2xl rounded-full p-4 border-0 transition-all duration-300 hover:scale-110 hover:shadow-purple-500/50"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto scrollbar-hide px-8"
                  onScroll={updateScrollButtons}
                >
                  <div className="flex space-x-6 pb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {similarProducts.map((similarProduct, index) => (
                      <Card
                        key={similarProduct.id}
                        className="min-w-[200px] max-w-[200px] group cursor-pointer border border-purple-100 bg-white/90 backdrop-blur-sm hover:border-purple-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 rounded-xl overflow-hidden"
                      >
                        <div
                          className="aspect-[9/16] relative bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden"
                          onClick={() => navigate(`/product/${encodeURIComponent(similarProduct.name)}`)}
                        >
                          {similarProduct.images && similarProduct.images.length > 0 ? (
                            <img
                              src={similarProduct.images[similarProduct.cover_image_index || 0]}
                              alt={similarProduct.name}
                              className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-16 w-16 text-purple-300" />
                            </div>
                          )}

                          {/* Gradient Overlay on Hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* Badges - Premium Design */}
                          <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                            {similarProduct.featured && (
                              <Badge className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 text-white text-xs font-black px-3 py-1 shadow-xl border-0">
                                ⭐ Featured
                              </Badge>
                            )}
                            {similarProduct.best_seller && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black px-3 py-1 shadow-xl border-0">
                                🔥 Best Seller
                              </Badge>
                            )}
                            {similarProduct.new_collection && (
                              <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black px-3 py-1 shadow-xl border-0">
                                ✨ New
                              </Badge>
                            )}
                          </div>

                          {/* Quick Add to Cart Button - Premium */}
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
                            <Button
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (similarProduct.colors && similarProduct.colors.length > 0) {
                                  addToCart(
                                    similarProduct,
                                    similarProduct.colors[0],
                                    1,
                                    similarProduct.images?.[0],
                                    undefined,
                                    undefined,
                                    similarProduct.sizes,
                                  );
                                  toast({
                                    title: "Added to Cart",
                                    description: `${similarProduct.name} added to cart`,
                                  });
                                }
                              }}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-2xl hover:scale-110 rounded-full px-6 py-3 font-black transition-all duration-300"
                            >
                              <ShoppingBag className="h-5 w-5 mr-2" />
                              Quick Add
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-3 bg-white">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-purple-600 transition-colors duration-300">
                              {similarProduct.name}
                            </h3>

                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline space-x-1.5">
                                <span className="font-bold text-lg text-purple-600">
                                  ₹{similarProduct.price.toLocaleString()}
                                </span>
                                {similarProduct.original_price &&
                                  similarProduct.original_price > similarProduct.price && (
                                    <span className="text-xs text-slate-400 line-through font-medium">
                                      ₹{similarProduct.original_price.toLocaleString()}
                                    </span>
                                  )}
                              </div>
                            </div>

                            {/* Colors Preview - Enhanced */}
                            {similarProduct.colors && similarProduct.colors.length > 0 && (
                              <div className="flex items-center space-x-2 pt-2 border-t border-purple-100">
                                <span className="text-xs font-bold text-slate-600">Colors:</span>
                                <div className="flex space-x-2">
                                  {similarProduct.colors.slice(0, 4).map((color: string, index: number) => (
                                    <ColorCircle key={index} color={color} size="20" />
                                  ))}
                                  {similarProduct.colors.length > 4 && (
                                    <span className="text-xs text-slate-500 font-bold flex items-center">
                                      +{similarProduct.colors.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Quantity Selection Modal */}
      <Dialog open={showQuantityModal} onOpenChange={setShowQuantityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Quantity</DialogTitle>
            <DialogDescription>Choose how many items you want to add to your cart.</DialogDescription>
          </DialogHeader>

          {product && selectedColors.length > 0 && (
            <div className="space-y-6">
              {/* Product Summary */}
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <img
                  src={imagesToShow[currentImageIndex] || product.images?.[0]}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Color: {getColorName(selectedColors[0])}
                    {selectedSize && ` • Size: ${selectedSize}`}
                    {selectedStretchType && ` • Stretch: ${selectedStretchType}`}
                  </p>
                  <p className="text-sm font-medium text-primary">₹{currentPrice.toLocaleString()} each</p>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Quantity</h4>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center border-2 border-primary rounded-lg bg-background">
                    <button
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      className="px-6 py-4 hover:bg-muted transition-colors text-xl font-semibold"
                      disabled={modalQuantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-8 py-4 min-w-[5rem] text-center font-bold text-2xl bg-primary/10 text-primary">
                      {modalQuantity}
                    </span>
                    <button
                      onClick={() => setModalQuantity(Math.min(availableStock, modalQuantity + 1))}
                      className="px-6 py-4 hover:bg-muted transition-colors text-xl font-semibold"
                      disabled={modalQuantity >= availableStock}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p className="text-lg font-semibold text-foreground mt-2">
                    Total: ₹{(currentPrice * modalQuantity).toLocaleString()}
                  </p>
                </div>

                {/* Offer Information */}
                {calculateBestPricing.applicableOffer && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">
                      🎉 {calculateBestPricing.applicableOffer.title}
                    </h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Price per item: ₹{currentPrice.toLocaleString()}</p>
                      <p>Total: ₹{(currentPrice * modalQuantity).toLocaleString()}</p>
                      {calculateBestPricing.discountAmount > 0 && (
                        <p className="font-medium">
                          You save: ₹{(calculateBestPricing.discountAmount * modalQuantity).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowQuantityModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAddToCart}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {confirmationAction === "cart" ? "Add to Cart" : "Buy Now"}
            </DialogTitle>
            <DialogDescription>Please confirm your selection before proceeding</DialogDescription>
          </DialogHeader>

          {product && selectedColors.length > 0 && (
            <div className="space-y-4">
              {/* Product Image */}
              <div className="flex justify-center">
                <img
                  src={imagesToShow[currentImageIndex] || product.images?.[0]}
                  alt={product.name}
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              </div>

              {/* Product Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{product.name}</h3>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Color:</span> {getColorName(selectedColors[0])}
                  </p>
                  {selectedSize && (
                    <p>
                      <span className="font-medium">Size:</span> {selectedSize}
                    </p>
                  )}
                  {selectedStretchType && (
                    <p>
                      <span className="font-medium">Stretch:</span> {selectedStretchType}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Quantity:</span> {modalQuantity}
                  </p>
                </div>

                {/* Price Information */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price per item:</span>
                    <div className="text-right">
                      {modalPricing.discountAmount > 0 && (
                        <span className="text-sm text-gray-500 line-through mr-2">
                          ₹{modalPricing.originalPrice.toLocaleString()}
                        </span>
                      )}
                      <span className="font-semibold">₹{modalPricing.unitPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  {modalPricing.discountAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">Discount per item:</span>
                      <span className="font-semibold text-green-600">
                        -₹{modalPricing.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total:</span>
                    <span className="font-bold text-lg text-primary">₹{modalPricing.totalPrice.toLocaleString()}</span>
                  </div>
                  {modalPricing.discountAmount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Total Savings:</span>
                      <span className="font-bold text-green-700">
                        ₹{(modalPricing.discountAmount * modalQuantity).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Offer Information */}
                {modalPricing.applicableOffer && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-1">🎉 {modalPricing.applicableOffer.title}</h4>
                    <p className="text-sm text-green-700">Special offer applied!</p>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                  disabled={modalQuantity <= 1}
                >
                  -
                </Button>
                <span className="text-lg font-semibold min-w-[2rem] text-center">{modalQuantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalQuantity(modalQuantity + 1)}
                  disabled={modalQuantity >= 10}
                >
                  +
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowConfirmationDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  className={`flex-1 ${
                    confirmationAction === "cart"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {confirmationAction === "cart" ? (
                    <>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Add to Cart
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
