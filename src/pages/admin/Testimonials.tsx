// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  MessageSquare,
  Star,
  Eye,
  Upload,
  Image as ImageIcon,
  User,
  MapPin,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Scissors
} from 'lucide-react';
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, uploadAdminImage } from '@/lib/api-admin';
import type { Testimonial } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ImageCropper from '@/components/ImageCropper';

const TestimonialManagement = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  // Use delayed loading hook
  const { isLoading, isRefreshing, executeWithLoading } = useDelayedLoading({ minimumDelay: 300, preserveData: true });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_location: '',
    content: '',
    rating: 5,
    image_url: '',
    is_active: true,
    display_order: 0
  });

  // Stable input change handlers for optimal performance
  const handleInputChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSwitchChange = useCallback((field: string) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  }, []);

  // Updated function to fetch and sort data
  const fetchTestimonials = async () => {
    const data = await getTestimonials();
    setTestimonials(data);
    return data;
  };

  useEffect(() => {
    executeWithLoading(fetchTestimonials, { isRefresh: false, preserveData: true })
      .then(() => setHasLoadedOnce(true))
      .catch(() => {});
  }, [executeWithLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Testimonial content is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      toast({
        title: "Validation Error",
        description: "Rating must be between 1 and 5.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedTestimonial) {
        const updates = { ...formData };
        delete updates.id;

        const updated = await updateTestimonial(selectedTestimonial.id, updates);
        setTestimonials((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast({ title: "Testimonial Updated", description: "Testimonial has been updated successfully." });
      } else {
        const created = await createTestimonial(formData);
        setTestimonials((prev) => [created, ...prev]);
        toast({ title: "Testimonial Added", description: "New testimonial has been added successfully." });
      }
      
      executeWithLoading(fetchTestimonials, { isRefresh: true, preserveData: true }).catch(() => {});
      
      resetForm();
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (error) {
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save testimonial.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setFormData({
      customer_name: testimonial.customer_name,
      customer_location: testimonial.customer_location || '',
      content: testimonial.content,
      rating: testimonial.rating || 5,
      image_url: testimonial.image_url || '',
      is_active: testimonial.is_active,
      display_order: testimonial.display_order
    });
    setShowEditModal(true);
  };

  const handleView = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this testimonial?')) {
      try {
        setTestimonials(prev => prev.filter(t => t.id !== id));
        await deleteTestimonial(id);
        toast({ title: "Testimonial Deleted", description: "Testimonial has been deleted successfully." });
        executeWithLoading(fetchTestimonials, { isRefresh: true, preserveData: true }).catch(() => {});
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete testimonial.",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t));
      await updateTestimonial(id, { is_active: isActive });
      toast({ title: "Status Updated", description: `Testimonial ${isActive ? 'activated' : 'deactivated'} successfully.` });
      executeWithLoading(fetchTestimonials, { isRefresh: true, preserveData: true }).catch(() => {});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update testimonial status.",
        variant: "destructive",
      });
    }
  };

  const handleDisplayOrderChange = async (id: string, direction: 'up' | 'down') => {
    const testimonial = testimonials.find(t => t.id === id);
    if (!testimonial) return;

    const newOrder = direction === 'up' ? testimonial.display_order - 1 : testimonial.display_order + 1;
    
    try {
      setTestimonials(prev => 
        prev
          .map(t => (t.id === id ? { ...t, display_order: newOrder } : t))
          .sort((a, b) => a.display_order - b.display_order)
      );
      
      await updateTestimonial(id, { display_order: newOrder });
      toast({ title: "Order Updated", description: "Display order has been updated successfully." });
      executeWithLoading(fetchTestimonials, { isRefresh: true, preserveData: true }).catch(() => {});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update display order.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      const uploadedUrl = await uploadAdminImage(file, 'testimonials');
      
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
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped-testimonial-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const uploadedUrl = await uploadAdminImage(file, 'testimonials');
      
      setFormData(prev => ({
        ...prev,
        image_url: uploadedUrl
      }));
      
      toast({
        title: "Image Cropped",
        description: "Customer image has been cropped and updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Crop Failed",
        description: "Failed to save cropped image. Please try again.",
        variant: "destructive",
      });
    }
  };
  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_location: '',
      content: '',
      rating: 5,
      image_url: '',
      is_active: true,
      display_order: 0
    });
    setSelectedTestimonial(null);
  };

  const filteredTestimonials = testimonials.filter(testimonial => {
    const matchesSearch = testimonial.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          testimonial.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (testimonial.customer_location && testimonial.customer_location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && testimonial.is_active) ||
                          (statusFilter === 'inactive' && !testimonial.is_active);
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      title: 'Total Testimonials',
      value: testimonials.length,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      title: 'Active Testimonials',
      value: testimonials.filter(t => t.is_active).length,
      icon: MessageSquare,
      color: 'text-green-600'
    },
    {
      title: 'Inactive Testimonials',
      value: testimonials.filter(t => !t.is_active).length,
      icon: MessageSquare,
      color: 'text-red-600'
    },
    {
      title: 'Average Rating',
      value: testimonials.length > 0 ? 
        (testimonials.reduce((sum, t) => sum + (t.rating || 5), 0) / testimonials.length).toFixed(1) : 
        '0.0',
      icon: Star,
      color: 'text-yellow-600'
    }
  ];

  const TestimonialModal = ({ isEdit = false, isView = false }) => (
    <Dialog 
      open={isEdit ? showEditModal : isView ? showViewModal : showAddModal} 
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          if (isEdit) {
            setShowEditModal(false);
            resetForm();
          } else if (isView) {
            setShowViewModal(false);
            setSelectedTestimonial(null);
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
            {isView ? 'Testimonial Details' : isEdit ? 'Edit Testimonial' : 'Add Testimonial'}
          </DialogTitle>
        </DialogHeader>

        {isView ? (
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer Name</Label>
                  <p className="text-lg font-medium">{selectedTestimonial?.customer_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="text-sm">{selectedTestimonial?.customer_location || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rating</Label>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          i < (selectedTestimonial?.rating || 5) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                    <span className="ml-2 text-sm">({selectedTestimonial?.rating || 5}/5)</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={selectedTestimonial?.is_active ? 'default' : 'secondary'}>
                    {selectedTestimonial?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Display Order</Label>
                  <p className="text-sm">{selectedTestimonial?.display_order}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Customer Image</Label>
                {selectedTestimonial?.image_url ? (
                  <img 
                    src={selectedTestimonial.image_url} 
                    alt={selectedTestimonial.customer_name}
                    className="w-32 h-32 object-cover rounded-full border mt-2 mx-auto"
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-full border mt-2 mx-auto flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Testimonial Content</Label>
              <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                <p className="italic">"{selectedTestimonial?.content}"</p>
              </div>
            </div>
          </div>
        ) : (
          <>
          <div className="max-h-[75vh] overflow-y-auto p-1">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange('customer_name')}
                    placeholder="Enter customer name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_location">Customer Location</Label>
                  <Input
                    id="customer_location"
                    value={formData.customer_location}
                    onChange={handleInputChange('customer_location')}
                    placeholder="Enter customer location (e.g., Mumbai, India)"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating *</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.rating}
                      onChange={handleInputChange('rating')}
                      className="w-20"
                      required
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 cursor-pointer ${
                            i < formData.rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                          onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, rating: i + 1 }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={handleInputChange('display_order')}
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={handleSwitchChange('is_active')}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is_active">Display on Website</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Image (Optional)</Label>
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
                          {uploadingImage ? 'Uploading...' : 'Click to upload customer photo'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, JPEG up to 10MB
                        </p>
                      </label>
                    </div>
                    
                    {formData.image_url && (
                      <div className="relative mx-auto w-32">
                        <img
                          src={formData.image_url}
                          alt="Customer preview"
                          className="w-32 h-32 object-cover rounded-full border mx-auto"
                        />
                        <div className="absolute top-0 right-0 flex space-x-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-full w-6 h-6 p-0"
                            onClick={() => {
                              setCropImageUrl(formData.image_url);
                              setShowCropper(true);
                            }}
                          >
                            <Scissors className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="rounded-full w-6 h-6 p-0"
                            onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                            disabled={isSubmitting}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Testimonial Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={handleInputChange('content')}
                placeholder="Enter the customer's testimonial..."
                rows={4}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length}/500 characters
              </p>
            </div>

            </form>
          </div>
          <div className="flex space-x-4 justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (isEdit) {
                    setShowEditModal(false);
                  } else {
                    setShowAddModal(false);
                  }
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget.closest('[role="dialog"]')?.querySelector('form');
                  if (form) {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                  }
                }}
                className="bg-primary text-primary-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (isEdit ? 'Update Testimonial' : 'Add Testimonial')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Testimonials Management</h1>
          <p className="text-muted-foreground">Manage customer testimonials and reviews</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => executeWithLoading(fetchTestimonials, { isRefresh: true, preserveData: true })}
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
            Add Testimonial
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search testimonials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Testimonials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Testimonials ({filteredTestimonials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">CUSTOMER</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">TESTIMONIAL</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">RATING</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">STATUS</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">DISPLAY ORDER</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">CREATED</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTestimonials.map((testimonial) => (
                  <tr key={testimonial.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {testimonial.image_url ? (
                          <img 
                            src={testimonial.image_url} 
                            alt={testimonial.customer_name}
                            className="w-10 h-10 object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{testimonial.customer_name}</p>
                          {testimonial.customer_location && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {testimonial.customer_location}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                        "{testimonial.content}"
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${
                              i < (testimonial.rating || 5) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                        <span className="ml-1 text-sm">({testimonial.rating || 5})</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                          {testimonial.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch
                          checked={testimonial.is_active}
                          onCheckedChange={(checked) => handleToggleActive(testimonial.id, checked)}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{testimonial.display_order}</span>
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => handleDisplayOrderChange(testimonial.id, 'up')}
                            disabled={isSubmitting}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => handleDisplayOrderChange(testimonial.id, 'down')}
                            disabled={isSubmitting}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{new Date(testimonial.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(testimonial)}
                          disabled={isSubmitting}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(testimonial)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(testimonial.id)}
                          disabled={isSubmitting}
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

      <TestimonialModal isEdit={false} isView={false} />
      <TestimonialModal isEdit={true} isView={false} />
      <TestimonialModal isEdit={false} isView={true} />
      
      {/* Image Cropper */}
      <ImageCropper
        isOpen={showCropper}
        imageUrl={cropImageUrl}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
        aspectRatio={1} // Square aspect ratio for customer photos
        cropShape="round"
        title="Crop Customer Photo"
      />
    </div>
  );
};

export default TestimonialManagement;
