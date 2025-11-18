// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Package,
  Eye,
  Upload,
  Image as ImageIcon,
  Scissors,
  X,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { getProductsForAdmin, getCategories, getVendorsForProducts, createProduct, updateProduct, deleteProduct, hideProduct, restoreProduct, canDeleteProduct, uploadMultipleImages } from '@/lib/api-admin';
import type { Product, Category, Vendor } from '@/lib/supabase';
import { getProductTotalStock } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ColorCircle } from '@/lib/colorUtils';
import ImageCropper from '@/components/ImageCropper';

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // all, active, hidden
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [cropImageIndex, setCropImageIndex] = useState(0);
  const { toast } = useToast();

  const { isLoading, executeWithLoading } = useDelayedLoading();

  // Available dress sizes
  const availableDressSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const [selectedDressSizes, setSelectedDressSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']);

  // Helper function to check if product is a dress
  const isDressProduct = () => {
    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    return selectedCategory?.name?.toLowerCase().includes('dress') || false;
  };

  // Update color_size_stock when selected dress sizes change
  const updateColorSizeStockWithSelectedSizes = () => {
    const sizesWithStock = selectedDressSizes.map(size => ({ size, stock: 0 }));
    setFormData(prev => ({
      ...prev,
      color_size_stock: (prev.color_size_stock || []).map(variant => {
        // Preserve existing stock values for sizes that are still selected
        const existingSizes = variant.sizes || [];
        const updatedSizes = selectedDressSizes.map(size => {
          const existingSize = existingSizes.find((s: any) => s.size === size);
          return existingSize || { size, stock: 0 };
        });
        
        return {
          ...variant,
          sizes: updatedSizes
        };
      })
    }));
  };

  // Form data state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    sku: '',
    price: 0,
    original_price: 0,
    fabric: '',
    care_instructions: '',
    category_id: '',
    vendor_id: '',
    images: [],
    colors: [],
    color_stock: [{ color: '', stock: 0 }],
    color_size_stock: [{ color: '', sizes: [{ size: 'S', stock: 0 }, { size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }, { size: 'XXL', stock: 0 }, { size: 'XXXL', stock: 0 }] }],
    sizes: ['Free Size'],
    is_active: true,
    featured: false,
    best_seller: false,
    new_collection: false,
    new_collection_start_date: null,
    new_collection_end_date: null,
    sort_order: 0,
    cover_image_index: 0
  });

  useEffect(() => {
    executeWithLoading(loadData);
  }, [executeWithLoading]);

  // Update color_size_stock when selected dress sizes change
  useEffect(() => {
    if (isDressProduct() && formData.color_size_stock && formData.color_size_stock.length > 0) {
      updateColorSizeStockWithSelectedSizes();
    }
  }, [selectedDressSizes]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData, vendorsData] = await Promise.all([
        getProductsForAdmin(),
        getCategories(),
        getVendorsForProducts()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setVendors(vendorsData);
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to load products data",
        variant: "destructive"
      });
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || 
                          (selectedStatus === 'active' && product.is_active) ||
                          (selectedStatus === 'inactive' && !product.is_active);
      const matchesVisibility = visibilityFilter === 'all' || 
                               (visibilityFilter === 'active' && product.is_active) ||
                               (visibilityFilter === 'hidden' && !product.is_active);
      return matchesSearch && matchesCategory && matchesStatus && matchesVisibility;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus, visibilityFilter]);

  // Add pagination for filtered products
  const pagination = usePagination(filteredProducts, 12);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    try {
      const uploadedUrls = await uploadMultipleImages(Array.from(files), 'products');
      
      if (uploadedUrls && uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedUrls]
        }));
        toast({
          title: "Images Uploaded",
          description: `${uploadedUrls.length} image(s) uploaded successfully.`
        });
      } else {
        throw new Error('No URLs returned from upload');
      }
    } catch (error) {
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
      cover_image_index: prev.cover_image_index && prev.cover_image_index >= index ? 
        Math.max(0, prev.cover_image_index - 1) : prev.cover_image_index
    }));
  };

  const setMainImage = (index: number) => {
    setFormData(prev => ({ ...prev, cover_image_index: index }));
  };

  const addColorVariant = () => {
    const newVariants = [...(formData.color_stock || []), { color: '', stock: 0 }];
    const newColorImages = [...((formData.color_images as any) || []), []];
    setFormData(prev => ({ 
      ...prev, 
      color_stock: newVariants,
      color_images: newColorImages as any
    }));
  };

  const removeColorVariant = (index: number) => {
    const newVariants = (formData.color_stock || []).filter((_, i) => i !== index);
    const newColorImages = ((formData.color_images as any) || []).filter((_, i) => i !== index);
    setFormData(prev => ({ 
      ...prev, 
      color_stock: newVariants,
      color_images: newColorImages as any
    }));
  };

  const updateColorVariant = (index: number, field: 'color' | 'stock', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      color_stock: (prev.color_stock || []).map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  // Color-size stock management for dresses
  const addColorSizeVariant = () => {
    const sizesWithStock = selectedDressSizes.map(size => ({ size, stock: 0 }));
    const newVariants = [...(formData.color_size_stock || []), { 
      color: '', 
      sizes: sizesWithStock
    }];
    const newColorImages = [...((formData.color_images as any) || []), []];
    setFormData(prev => ({ 
      ...prev, 
      color_size_stock: newVariants,
      color_images: newColorImages as any
    }));
  };

  const removeColorSizeVariant = (index: number) => {
    const newVariants = (formData.color_size_stock || []).filter((_, i) => i !== index);
    const newColorImages = ((formData.color_images as any) || []).filter((_, i) => i !== index);
    setFormData(prev => ({ 
      ...prev, 
      color_size_stock: newVariants,
      color_images: newColorImages as any
    }));
  };

  const updateColorSizeVariant = (index: number, field: 'color', value: string) => {
    setFormData(prev => ({
      ...prev,
      color_size_stock: (prev.color_size_stock || []).map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const updateSizeStock = (colorIndex: number, sizeIndex: number, stock: number) => {
    setFormData(prev => ({
      ...prev,
      color_size_stock: (prev.color_size_stock || []).map((variant, i) => 
        i === colorIndex ? {
          ...variant,
          sizes: variant.sizes.map((size, j) => 
            j === sizeIndex ? { ...size, stock } : size
          )
        } : variant
      )
    }));
  };

  const handleColorImageUpload = async (colorIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    try {
      const uploadedUrls = await uploadMultipleImages(Array.from(files), 'products');
      
      if (uploadedUrls && uploadedUrls.length > 0) {
        const newColorImages = [...((formData.color_images as any) || [])];
        while (newColorImages.length <= colorIndex) {
          newColorImages.push([]);
        }
        
        newColorImages[colorIndex] = [...(newColorImages[colorIndex] || []), ...uploadedUrls];
        
        setFormData(prev => ({
          ...prev,
          color_images: newColorImages as any
        }));
        
        toast({
          title: "Images Uploaded",
          description: `${uploadedUrls.length} image(s) uploaded successfully for color variant.`
        });
      } else {
        throw new Error('No URLs returned from upload');
      }
    } catch (error) {
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const getColorImages = (colorIndex: number): string[] => {
    const colorImages = (formData.color_images as any) || [];
    return colorImages[colorIndex] || [];
  };

  const removeColorImage = (colorIndex: number, imageIndex: number) => {
    const newColorImages = [...((formData.color_images as any) || [])];
    if (newColorImages[colorIndex]) {
      newColorImages[colorIndex] = newColorImages[colorIndex].filter((_, i) => i !== imageIndex);
      setFormData(prev => ({
        ...prev,
        color_images: newColorImages as any
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      price: 0,
      original_price: 0,
      fabric: '',
      care_instructions: '',
      category_id: '',
      vendor_id: '',
      images: [],
      colors: [],
      color_stock: [{ color: '', stock: 0 }],
      color_size_stock: [{ color: '', sizes: [{ size: 'S', stock: 0 }, { size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }, { size: 'XXL', stock: 0 }, { size: 'XXXL', stock: 0 }] }],
      color_images: [],
      stretch_variants: [],
      sizes: ['Free Size'],
      is_active: true,
      featured: false,
      best_seller: false,
      new_collection: false,
      new_collection_start_date: null,
      new_collection_end_date: null,
      sort_order: 0,
      cover_image_index: 0
    });
    setSelectedDressSizes(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
    setEditingProduct(null);
  };

  const handleAddProduct = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditProduct = (product: Product) => {
    // Initialize selectedDressSizes based on existing color_size_stock data
    if (product.color_size_stock && product.color_size_stock.length > 0) {
      const existingSizes = product.color_size_stock[0]?.sizes?.map((s: any) => s.size) || [];
      if (existingSizes.length > 0) {
        setSelectedDressSizes(existingSizes);
      }
    }
    
    setFormData({
      ...product,
      color_stock: product.color_stock && product.color_stock.length > 0 ? product.color_stock : [{ color: '', stock: 0 }],
      color_size_stock: product.color_size_stock && product.color_size_stock.length > 0 ? product.color_size_stock : [{ color: '', sizes: [{ size: 'S', stock: 0 }, { size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }, { size: 'XXL', stock: 0 }, { size: 'XXXL', stock: 0 }] }],
      color_images: product.color_images || [],
      stretch_variants: product.stretch_variants || []
    });
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.sku?.trim()) {
      toast({
        title: "Validation Error", 
        description: "SKU is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.price || Number(formData.price) <= 0) {
      toast({
        title: "Validation Error",
        description: "Valid price is required",
        variant: "destructive"
      });
      return;
    }

    // Validate dress product color-size stock
    if (isDressProduct()) {
      const validColorSizeStock = (formData.color_size_stock || []).filter(variant => 
        variant.color && variant.color.trim() !== '' && 
        variant.sizes && variant.sizes.length > 0 &&
        variant.sizes.some(sizeItem => sizeItem.stock > 0)
      );

      if (validColorSizeStock.length === 0) {
        toast({
          title: "Validation Error",
          description: "Dress products require at least one color with available stock in sizes",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Extract colors based on product type
      let colors: string[] = [];
      if (isDressProduct()) {
        colors = (formData.color_size_stock || [])
          .map(variant => variant.color)
          .filter(color => color && color.trim() !== '');
      } else {
        colors = (formData.color_stock || [])
          .map(variant => variant.color)
          .filter(color => color && color.trim() !== '');
      }

      // Prepare product data with proper validation
      const productData = {
        ...formData,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description?.trim() || '',
        colors,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        sort_order: Number(formData.sort_order) || 0,
        images: formData.images || [],
        color_stock: isDressProduct() ? [] : (formData.color_stock || []),
        color_size_stock: isDressProduct() ? (formData.color_size_stock || []) : [],
        color_images: formData.color_images || [],
        stretch_variants: formData.stretch_variants || [],
        sizes: formData.sizes || ['Free Size'],
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        featured: formData.featured || false,
        best_seller: formData.best_seller || false,
        fabric: formData.fabric?.trim() || '',
        care_instructions: formData.care_instructions?.trim() || '',
        category_id: formData.category_id || null,
        vendor_id: formData.vendor_id || null,
        cover_image_index: formData.cover_image_index || 0
      };

      // Calculate total stock and stock status for dress products
      let totalStock = formData.total_stock || 0;
      let stockStatus = formData.stock_status || 'out_of_stock';
      
      if (isDressProduct() && formData.color_size_stock && formData.color_size_stock.length > 0) {
        // Calculate total stock from color_size_stock
        totalStock = 0;
        formData.color_size_stock.forEach(variant => {
          if (variant.sizes && variant.sizes.length > 0) {
            variant.sizes.forEach(sizeVariant => {
              totalStock += sizeVariant.stock || 0;
            });
          }
        });
        
        // Determine stock status based on total stock
        if (totalStock === 0) {
          stockStatus = 'out_of_stock';
        } else if (totalStock <= 5) {
          stockStatus = 'low_stock';
        } else {
          stockStatus = 'in_stock';
        }
      }

      // Add calculated stock data to productData
      productData.total_stock = totalStock;
      productData.stock_status = stockStatus;

      if (editingProduct) {
        // Create a copy of the payload and remove readonly/computed fields
        const updates = { ...productData } as any;
        delete updates.id;
        delete updates.vendor;
        delete updates.vendors;
        delete updates.created_at;
        delete updates.updated_at;
        // Keep total_stock and stock_status for dress products
        if (isDressProduct()) {
          // Keep the calculated values
        } else {
          delete updates.total_stock;
          delete updates.stock_status;
        }

        await updateProduct(editingProduct.id, updates);
        toast({
          title: "Success",
          description: "Product updated successfully"
        });
      } else {
        // Remove computed fields for new products
        const newProductData = { ...productData } as any;
        delete newProductData.id;
        delete newProductData.vendor;
        delete newProductData.vendors;
        delete newProductData.created_at;
        delete newProductData.updated_at;
        // Keep total_stock and stock_status for dress products
        if (!isDressProduct()) {
          delete newProductData.total_stock;
          delete newProductData.stock_status;
        }

        await createProduct(newProductData);
        toast({
          title: "Success", 
          description: "Product created successfully"
        });
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : "Failed to save product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHideProduct = async (id: string) => {
    try {
      await hideProduct(id);
      toast({
        title: "Product Hidden",
        description: "Product has been hidden from public view"
      });
      await loadData();
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : "Failed to hide product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleRestoreProduct = async (id: string) => {
    try {
      await restoreProduct(id);
      toast({
        title: "Product Restored",
        description: "Product has been restored and is now visible to customers"
      });
      await loadData();
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : "Failed to restore product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      // First check if the product can be deleted
      const deletionCheck = await canDeleteProduct(id);
      
      if (!deletionCheck.canDelete) {
        toast({
          title: "Cannot Delete Product",
          description: deletionCheck.reason || "Product cannot be deleted",
          variant: "destructive"
        });
        return;
      }

      // Show warning if there are historical orders
      const confirmMessage = deletionCheck.orderCount 
        ? `Warning: This product has ${deletionCheck.orderCount} historical orders. Are you sure you want to delete it? This action cannot be undone.`
        : 'Are you sure you want to delete this product? This action cannot be undone.';
      
      if (!window.confirm(confirmMessage)) return;
      
      await deleteProduct(id);
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      await loadData();
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCropImage = (imageUrl: string, index: number) => {
    setCropImageUrl(imageUrl);
    setCropImageIndex(index);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const uploadedUrls = await uploadMultipleImages([file], 'products');
      
      if (uploadedUrls && uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: (prev.images || []).map((img, i) => i === cropImageIndex ? uploadedUrls[0] : img)
        }));
        
        toast({
          title: "Image Cropped",
          description: "Image has been cropped and updated successfully."
        });
      } else {
        throw new Error('Failed to upload cropped image');
      }
      
      setShowCropper(false);
    } catch (error) {
      
      toast({
        title: "Crop Failed",
        description: error instanceof Error ? error.message : "Failed to save cropped image",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton type="default" rows={8} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="active">Visible Only</SelectItem>
                <SelectItem value="hidden">Hidden Only</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {pagination.totalItems} products ({pagination.paginatedData.length} shown)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagination.paginatedData.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square relative bg-muted">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[product.cover_image_index || 0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex space-x-1">
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
                {product.featured && (
                  <Badge variant="outline">Featured</Badge>
                )}
                {product.best_seller && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Best Seller</Badge>
                )}
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.sku}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">₹{product.price}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{product.original_price}
                      </span>
                    )}
                  </div>
                  <Badge variant={
                    getProductTotalStock(product) === 0 ? 'secondary' :
                    getProductTotalStock(product) <= 10 ? 'destructive' : 'default'
                  }>
                    {getProductTotalStock(product)} in stock
                  </Badge>
                </div>

                {product.colors && product.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.colors.slice(0, 5).map((color, index) => (
                      <ColorCircle key={index} color={color} size="16" />
                    ))}
                    {product.colors.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{product.colors.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                    title="Edit Product"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {product.is_active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHideProduct(product.id)}
                      title="Hide Product"
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreProduct(product.id)}
                      title="Restore Product"
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                    title="Delete Product"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6">
        <TablePagination pagination={pagination} />
      </div>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) {
          setShowModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Enter product name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                    disabled={isSubmitting}
                    className="resize-none"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku || ''}
                      onChange={(e) => handleFormChange('sku', e.target.value)}
                      placeholder="Enter SKU"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order || 0}
                      onChange={(e) => handleFormChange('sort_order', Number(e.target.value))}
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price || 0}
                      onChange={(e) => handleFormChange('price', Number(e.target.value))}
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_price">Original Price</Label>
                    <Input
                      id="original_price"
                      type="number"
                      value={formData.original_price || 0}
                      onChange={(e) => handleFormChange('original_price', Number(e.target.value))}
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(value) => handleFormChange('category_id', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select
                    value={formData.vendor_id || ''}
                    onValueChange={(value) => handleFormChange('vendor_id', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.vendor_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Images and Additional Details */}
              <div className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Product Images</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="mt-2">
                        <Label htmlFor="image-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Upload images
                          </span>
                          <Input
                            id="image-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            disabled={isSubmitting || uploadingImages}
                          />
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB each
                      </p>
                      {uploadingImages && (
                        <p className="text-xs text-blue-600 mt-1">
                          Uploading images...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Image Gallery */}
                  {formData.images && formData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Product ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center space-x-1">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setMainImage(index)}
                              disabled={isSubmitting}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCropImage(image, index)}
                              disabled={isSubmitting}
                            >
                              <Scissors className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(index)}
                              disabled={isSubmitting}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {formData.cover_image_index === index && (
                            <Badge className="absolute -top-2 -right-2" variant="default">
                              Main
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="space-y-2">
                  <Label htmlFor="fabric">Fabric</Label>
                  <Input
                    id="fabric"
                    value={formData.fabric || ''}
                    onChange={(e) => handleFormChange('fabric', e.target.value)}
                    placeholder="e.g., Cotton, Silk, Polyester"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="care_instructions">Care Instructions</Label>
                  <Textarea
                    id="care_instructions"
                    value={formData.care_instructions || ''}
                    onChange={(e) => handleFormChange('care_instructions', e.target.value)}
                    placeholder="Care instructions for the product"
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => handleFormChange('is_active', checked)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => handleFormChange('featured', checked)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="best_seller"
                        checked={formData.best_seller}
                        onCheckedChange={(checked) => handleFormChange('best_seller', checked)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="best_seller">Best Seller</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="new_collection"
                        checked={formData.new_collection}
                        onCheckedChange={(checked) => handleFormChange('new_collection', checked)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="new_collection">New Collection</Label>
                    </div>
                  </div>

                  {/* New Collection Date Range */}
                  {formData.new_collection && (
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="new_collection_start_date">Start Date</Label>
                        <Input
                          id="new_collection_start_date"
                          type="date"
                          value={formData.new_collection_start_date || ''}
                          onChange={(e) => handleFormChange('new_collection_start_date', e.target.value || null)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_collection_end_date">End Date</Label>
                        <Input
                          id="new_collection_end_date"
                          type="date"
                          value={formData.new_collection_end_date || ''}
                          onChange={(e) => handleFormChange('new_collection_end_date', e.target.value || null)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground col-span-2">
                        Products will automatically move to regular collections after the end date.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stretch Variants */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Stretch Variants & Pricing</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newVariants = [...(formData.stretch_variants || []), { type: '', price: 0 }];
                    setFormData(prev => ({ ...prev, stretch_variants: newVariants }));
                  }}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stretch Variant
                </Button>
              </div>

              {(formData.stretch_variants || []).length > 0 && (
                <div className="space-y-3">
                  {formData.stretch_variants?.map((variant: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-end space-x-4">
                        <div className="flex-1">
                          <Label className="text-sm">Stretch Type</Label>
                          <Select
                            value={variant.type || ''}
                            onValueChange={(value) => {
                              const newVariants = [...(formData.stretch_variants || [])];
                              newVariants[index] = { ...newVariants[index], type: value };
                              setFormData(prev => ({ ...prev, stretch_variants: newVariants }));
                            }}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stretch type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stretchable">Stretchable</SelectItem>
                              <SelectItem value="non-stretchable">Non-Stretchable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Label className="text-sm">Price</Label>
                          <Input
                            type="number"
                            placeholder="Price"
                            value={variant.price || 0}
                            onChange={(e) => {
                              const newVariants = [...(formData.stretch_variants || [])];
                              newVariants[index] = { ...newVariants[index], price: Number(e.target.value) };
                              setFormData(prev => ({ ...prev, stretch_variants: newVariants }));
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newVariants = (formData.stretch_variants || []).filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, stretch_variants: newVariants }));
                          }}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dress Size Selection */}
            {isDressProduct() && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Available Sizes</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {availableDressSizes.map((size) => (
                    <div key={size} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`size-${size}`}
                        checked={selectedDressSizes.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDressSizes(prev => [...prev, size]);
                          } else {
                            setSelectedDressSizes(prev => prev.filter(s => s !== size));
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`size-${size}`} className="text-sm font-medium">
                        {size}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which sizes are available for this dress. Only selected sizes will be shown in the color-size management below.
                </p>
              </div>
            )}

            {/* Color Variants */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">
                  {isDressProduct() ? 'Color & Size Management' : 'Color Variants & Stock'}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={isDressProduct() ? addColorSizeVariant : addColorVariant}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Color
                </Button>
              </div>

              {isDressProduct() ? (
                // Dress-specific color-size management
                <div className="space-y-6">
                  {(formData.color_size_stock || []).map((variant, index) => (
                    <div key={index} className="p-6 border-2 border-primary/20 rounded-xl space-y-4 bg-muted/20">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Label className="text-base font-medium">Color Name</Label>
                          <Input
                            placeholder="Color name"
                            value={variant.color}
                            onChange={(e) => updateColorSizeVariant(index, 'color', e.target.value)}
                            disabled={isSubmitting}
                            className="mt-2 h-11 text-base"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeColorSizeVariant(index)}
                          disabled={isSubmitting || (formData.color_size_stock?.length || 0) <= 1}
                          className="mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Size and Stock Grid */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Size & Stock</Label>
                        <div className={`grid gap-4 ${
                          selectedDressSizes.length <= 3 ? 'grid-cols-2 md:grid-cols-3' :
                          selectedDressSizes.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
                          selectedDressSizes.length <= 6 ? 'grid-cols-2 md:grid-cols-6' :
                          'grid-cols-2 md:grid-cols-6'
                        }`}>
                          {variant.sizes.filter(sizeItem => selectedDressSizes.includes(sizeItem.size)).map((sizeItem, sizeIndex) => (
                            <div key={sizeIndex} className="space-y-2">
                              <Label className="text-sm font-medium text-center block">{sizeItem.size}</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={sizeItem.stock}
                                onChange={(e) => updateSizeStock(index, sizeIndex, Number(e.target.value))}
                                disabled={isSubmitting}
                                className="text-center h-10"
                                min="0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    
                    {/* Color Images */}
                    <div className="space-y-2">
                      <Label className="text-sm">Color Images</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                          <div className="mt-2">
                            <Label htmlFor={`color-images-${index}`} className="cursor-pointer">
                              <span className="text-sm font-medium text-primary hover:text-primary/80">
                                Upload images for {variant.color || 'this color'}
                              </span>
                              <Input
                                id={`color-images-${index}`}
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleColorImageUpload(index, e.target.files)}
                                disabled={isSubmitting || uploadingImages}
                              />
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF up to 10MB each
                          </p>
                          {uploadingImages && (
                            <p className="text-xs text-blue-600 mt-1">
                              Uploading images...
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Color Image Gallery */}
                      {getColorImages(index) && getColorImages(index).length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {getColorImages(index).map((image: string, imgIndex: number) => (
                            <div key={imgIndex} className="relative group">
                              <img
                                src={image}
                                alt={`${variant.color} ${imgIndex + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeColorImage(index, imgIndex)}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                // Regular color variants for non-dress products
                <div className="space-y-4">
                  {(formData.color_stock || []).map((variant, index) => (
                    <div key={index} className="p-6 border-2 border-primary/20 rounded-xl space-y-4 bg-muted/20">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Label className="text-base font-medium">Color Name</Label>
                          <Input
                            placeholder="Color name"
                            value={variant.color}
                            onChange={(e) => updateColorVariant(index, 'color', e.target.value)}
                            disabled={isSubmitting}
                            className="mt-2 h-11 text-base"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-base font-medium">Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variant.stock}
                            onChange={(e) => updateColorVariant(index, 'stock', Number(e.target.value))}
                            disabled={isSubmitting}
                            className="mt-2 h-11 text-base text-center"
                            min="0"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeColorVariant(index)}
                          disabled={isSubmitting || (formData.color_stock?.length || 0) <= 1}
                          className="mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Color Images */}
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Color Images</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                          <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                            <div className="mt-2">
                              <Label htmlFor={`color-images-${index}`} className="cursor-pointer">
                                <span className="text-sm font-medium text-primary hover:text-primary/80">
                                  Upload images for {variant.color || 'this color'}
                                </span>
                                <Input
                                  id={`color-images-${index}`}
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleColorImageUpload(index, e.target.files)}
                                  disabled={isSubmitting || uploadingImages}
                                />
                              </Label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, GIF up to 10MB each
                            </p>
                            {uploadingImages && (
                              <p className="text-xs text-blue-600 mt-1">
                                Uploading images...
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Color Image Gallery */}
                        {getColorImages(index) && getColorImages(index).length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {getColorImages(index).map((image: string, imgIndex: number) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={image}
                                  alt={`${variant.color} ${imgIndex + 1}`}
                                  className="w-full h-16 object-cover rounded border"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeColorImage(index, imgIndex)}
                                    disabled={isSubmitting}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      {showCropper && (
        <ImageCropper
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
          imageUrl={cropImageUrl}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default Products;
