// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Tag,
  Eye,
  Upload,
  Image as ImageIcon,
  Scissors,
  RefreshCw
} from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, uploadAdminImage } from '@/lib/api-admin';
import type { Category } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ImageCropper from '@/components/ImageCropper';

// Individual form field components with proper TypeScript interfaces
interface FormInputProps {
  label: string;
  id: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const FormInput = React.memo(({ label, id, value, onChange, type = "text", placeholder, required, disabled, className = "" }: FormInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when prop changes (for editing existing items)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e) => {
    if (!disabled) {
      const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    }
  }, [disabled, onChange, type]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
      />
    </div>
  );
});

interface FormTextareaProps {
  label: string;
  id: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

const FormTextarea = React.memo(({ label, id, value, onChange, placeholder, disabled, rows = 3 }: FormTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e) => {
    if (!disabled) {
      const newValue = e.target.value;
      // Convert placeholder value to empty string for parent component
      const normalizedNewValue = newValue === "_placeholder_" ? "" : (newValue ?? "");
      setLocalValue(newValue);
      onChange(newValue);
    }
  }, [disabled, onChange]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
});

interface FormSwitchProps {
  label: string;
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const FormSwitch = React.memo(({ label, id, checked, onChange, disabled }: FormSwitchProps) => {
  const [localChecked, setLocalChecked] = useState(checked);
  
  // Update local value when prop changes
  useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  const handleChange = useCallback((newChecked) => {
    if (!disabled) {
      setLocalChecked(newChecked);
      onChange(newChecked);
    }
  }, [disabled, onChange]);

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={id}
        checked={localChecked}
        onCheckedChange={handleChange}
        disabled={disabled}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
});

interface CategoryFormProps {
  formData: any;
  onFormChange: (field: string, value: any) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  handleImageUpload: (files: FileList | null) => void;
  uploadingImage: boolean;
  setCropImageUrl: (url: string) => void;
  setShowCropper: (show: boolean) => void;
}

// Separate form component with individual field state management
const CategoryForm = React.memo(({ formData, onFormChange, isSubmitting, onSubmit, onCancel, isEdit, handleImageUpload, uploadingImage, setCropImageUrl, setShowCropper }: CategoryFormProps) => {
  const formRef = useRef(null);

  // Create stable handlers for each field
  const handleNameChange = useCallback((value) => {
    onFormChange('name', value);
  }, [onFormChange]);

  const handleDescriptionChange = useCallback((value) => {
    onFormChange('description', value);
  }, [onFormChange]);

  const handleSortOrderChange = useCallback((value) => {
    onFormChange('sort_order', value);
  }, [onFormChange]);

  const handleIsActiveChange = useCallback((value) => {
    onFormChange('is_active', value);
  }, [onFormChange]);

  return (
    <div className="max-h-[75vh] overflow-y-auto p-1">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormInput
              label="Category Name"
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter category name"
              required
              disabled={isSubmitting}
            />

            <FormTextarea
              label="Description"
              id="description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Enter category description"
              rows={3}
              disabled={isSubmitting}
            />

            <FormInput
              label="Sort Order"
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={handleSortOrderChange}
              placeholder="0"
              disabled={isSubmitting}
            />

            <FormSwitch
              label="Active Category"
              id="is_active"
              checked={formData.is_active}
              onChange={handleIsActiveChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage || isSubmitting}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {uploadingImage ? 'Uploading...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </label>
                </div>
                
                {formData.image_url && (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Category preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
                
                {formData.image_url && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCropImageUrl(formData.image_url);
                        setShowCropper(true);
                      }}
                      disabled={isSubmitting}
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Crop Image
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onFormChange('image_url', '')}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 justify-end pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="bg-primary text-primary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Category' : 'Add Category')}
          </Button>
        </div>
      </form>
    </div>
  );
});

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { toast } = useToast();
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<Category[]>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);

  // Use useRef to store form data to prevent re-renders
  const formDataRef = useRef({
    name: '',
    description: '',
    image_url: '',
    images: [] as string[],
    cover_image_index: 0,
    is_active: true,
    sort_order: 0
  });

  // State to trigger form re-render only when needed
  const [formDataVersion, setFormDataVersion] = useState(0);

  // Get current form data
  const formData = formDataRef.current;

  // Optimized form change handler with ref-based updates
  const handleFormChange = useCallback((field, value) => {
    // Update the ref directly (no re-render)
    formDataRef.current = {
      ...formDataRef.current,
      [field]: value
    };
  }, []);

  // Reset form with fresh data
  const resetForm = useCallback(() => {
    formDataRef.current = {
      name: '',
      description: '',
      image_url: '',
      images: [] as string[],
      cover_image_index: 0,
      is_active: true,
      sort_order: 0
    };
    setSelectedCategory(null);
    setFormDataVersion(prev => prev + 1); // Trigger form re-render
  }, []);

  const handleCancelForm = useCallback(() => {
    setIsSubmitting(false);
    if (selectedCategory) {
      setShowEditModal(false);
    } else {
      setShowAddModal(false);
    }
    resetForm();
  }, [selectedCategory, resetForm]);

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchCategories, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, [executeWithLoading]);

  const fetchCategories = async () => {
    const data = await getCategories();
    setCategories(data);
    return data;
  };

  const handleRefresh = async () => {
    try {
      // This will show the background refresh indicator instead of full loading
      await executeWithLoading(fetchCategories, { isRefresh: true, preserveData: true });
      toast({
        title: "Data Refreshed",
        description: "Categories data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh categories data.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentFormData = formDataRef.current;
    
    if (!currentFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryData = {
        ...currentFormData,
        images: currentFormData.image_url ? [currentFormData.image_url] : [],
        cover_image_index: 0
      };

      if (selectedCategory) {
        await updateCategory(selectedCategory.id, categoryData);
        toast({
          title: "Category Updated",
          description: "Category has been updated successfully.",
        });
      } else {
        await createCategory(categoryData);
        toast({
          title: "Category Added",
          description: "New category has been added successfully.",
        });
      }
      
      // Refresh data in background without showing full loading
      await executeWithLoading(fetchCategories, { isRefresh: true, preserveData: true });
      resetForm();
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (error) {
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((category: Category) => {
    setSelectedCategory(category);
    formDataRef.current = {
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      images: category.images || [],
      cover_image_index: category.cover_image_index || 0,
      is_active: category.is_active,
      sort_order: category.sort_order
    };
    setFormDataVersion(prev => prev + 1); // Trigger form re-render
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((category: Category) => {
    setSelectedCategory(category);
    setShowViewModal(true);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const result = await deleteCategory(id);
        if (result.success) {
          // Refresh data in background without showing full loading
          await executeWithLoading(fetchCategories, { isRefresh: true, preserveData: true });
          toast({
            title: "Category Deleted",
            description: "Category has been deleted successfully.",
          });
        } else {
          toast({
            title: "Cannot Delete Category",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred while deleting the category.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCloseModal = (modalType: 'add' | 'edit' | 'view') => {
    setIsSubmitting(false);
    switch (modalType) {
      case 'add':
        setShowAddModal(false);
        resetForm();
        break;
      case 'edit':
        setShowEditModal(false);
        resetForm();
        break;
      case 'view':
        setShowViewModal(false);
        setSelectedCategory(null);
        break;
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      const uploadedUrl = await uploadAdminImage(file);
      
      // Open cropper instead of directly setting the image
      setCropImageUrl(uploadedUrl);
      setShowCropper(true);
    } catch (error) {
      
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      // Convert blob URL to file and upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped-category-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const uploadedUrl = await uploadAdminImage(file, 'categories');
      
      formDataRef.current = {
        ...formDataRef.current,
        image_url: uploadedUrl,
        images: [uploadedUrl]
      };
      
      toast({
        title: "Image Cropped",
        description: "Category image has been cropped and updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Crop Failed",
        description: "Failed to save cropped image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = [
    {
      title: 'Total Categories',
      value: categories.length,
      icon: Tag,
      color: 'text-blue-600'
    },
    {
      title: 'Active Categories',
      value: categories.filter(c => c.is_active).length,
      icon: Tag,
      color: 'text-green-600'
    },
    {
      title: 'Inactive Categories',
      value: categories.filter(c => !c.is_active).length,
      icon: Tag,
      color: 'text-red-600'
    }
  ];

  // Memoized modal component to prevent unnecessary re-renders
  interface CategoryModalProps {
    isEdit?: boolean;
    isView?: boolean;
  }
  
  const CategoryModal = React.memo(({ isEdit = false, isView = false }: CategoryModalProps) => (
    <Dialog 
      open={isEdit ? showEditModal : isView ? showViewModal : showAddModal} 
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          if (isEdit) {
            setShowEditModal(false);
            resetForm();
          } else if (isView) {
            setShowViewModal(false);
            setSelectedCategory(null);
          } else {
            setShowAddModal(false);
            resetForm();
          }
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isView ? 'Category Details' : isEdit ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
        </DialogHeader>

        {isView ? (
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category Name</Label>
                  <p className="text-lg font-medium">{selectedCategory?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedCategory?.description || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={selectedCategory?.is_active ? 'default' : 'secondary'}>
                    {selectedCategory?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sort Order</Label>
                  <p className="text-sm">{selectedCategory?.sort_order}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Category Image</Label>
                {selectedCategory?.image_url ? (
                  <img 
                    src={selectedCategory.image_url} 
                    alt={selectedCategory.name}
                    className="w-full h-48 object-cover rounded border mt-2"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded border mt-2 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <CategoryForm
            key={formDataVersion} // Force re-render when form data changes
            formData={formData}
            onFormChange={handleFormChange}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
            isEdit={isEdit}
            handleImageUpload={handleImageUpload}
            uploadingImage={uploadingImage}
            setCropImageUrl={setCropImageUrl}
            setShowCropper={setShowCropper}
          />
        )}
      </DialogContent>
    </Dialog>
  ));

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="cards" cardCount={6} />;
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Category Management</h1>
          <p className="text-muted-foreground">Manage product categories and classifications</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            className="bg-primary text-primary-foreground"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">CATEGORY</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">DESCRIPTION</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">STATUS</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">SORT ORDER</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">CREATED</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {category.image_url ? (
                          <img 
                            src={category.image_url} 
                            alt={category.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Tag className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{category.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description || 'No description'}
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{category.sort_order}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{new Date(category.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(category)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CategoryModal isEdit={false} isView={false} />
      <CategoryModal isEdit={true} isView={false} />
      <CategoryModal isEdit={false} isView={true} />
      
      {/* Image Cropper */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={16/9} // Category banner aspect ratio
        title="Crop Category Image"
      />
    </div>
  );
};

export default CategoryManagement;
