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
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Building2,
  Eye,
  Phone,
  Mail,
  MapPin,
  User,
  Download,
  FileText,
  RefreshCw
} from 'lucide-react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '@/lib/api-admin';
import type { Vendor } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Separate form component to prevent re-renders
const VendorForm = ({ formData, onFormChange, isSubmitting, onSubmit, onCancel, isEdit }) => {
  const formRef = useRef(null);

  // Stable input change handler
  const handleInputChange = useCallback((field) => (e) => {
    if (!isSubmitting) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      onFormChange(field, value);
    }
  }, [isSubmitting, onFormChange]);

  // Stable switch change handler
  const handleSwitchChange = useCallback((checked) => {
    if (!isSubmitting) {
      onFormChange('is_active', checked);
    }
  }, [isSubmitting, onFormChange]);

  return (
    <div className="max-h-[75vh] overflow-y-auto p-1">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_code">Vendor Code *</Label>
              <Input
                id="vendor_code"
                value={formData.vendor_code}
                onChange={handleInputChange('vendor_code')}
                placeholder="Enter vendor code"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="Enter vendor name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange('contact_person')}
                placeholder="Enter contact person name"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder="Enter phone number"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={handleInputChange('specialization')}
                placeholder="e.g., Silk Sarees, Cotton Handloom"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={handleInputChange('address')}
                placeholder="Enter complete address"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  placeholder="Enter city"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={handleInputChange('state')}
                  placeholder="Enter state"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={handleInputChange('pincode')}
                placeholder="Enter pincode"
                maxLength={6}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleInputChange('notes')}
                placeholder="Additional notes about vendor"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
                disabled={isSubmitting}
              />
              <Label htmlFor="is_active">Active Vendor</Label>
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
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Vendor' : 'Add Vendor')}
          </Button>
        </div>
      </form>
    </div>
  );
};

const VendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<Vendor[]>({ minimumDelay: 300, preserveData: true });

  // Default form data - moved outside component to prevent recreation
  const defaultFormData = useMemo(() => ({
    vendor_code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    specialization: '',
    is_active: true,
    notes: ''
  }), []);

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchVendors, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, [executeWithLoading]);

  const fetchVendors = async () => {
    const data = await getVendors();
    setVendors(data);
    return data;
  };

  const handleRefresh = async () => {
    try {
      // This will show the background refresh indicator instead of full loading
      await executeWithLoading(fetchVendors, { isRefresh: true, preserveData: true });
      toast({
        title: "Data Refreshed",
        description: "Vendors data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh vendors data.",
        variant: "destructive",
      });
    }
  };

  const generateVendorCode = useCallback(() => {
    const nextNumber = vendors.length + 1;
    return `VEN-${nextNumber.toString().padStart(3, '0')}`;
  }, [vendors.length]);

  // Optimized form change handler - only updates the specific field
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Reset form with fresh data
  const resetForm = useCallback(() => {
    setFormData({ ...defaultFormData });
    setSelectedVendor(null);
  }, [defaultFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.vendor_code.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor code is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (selectedVendor) {
        await updateVendor(selectedVendor.id, formData);
        toast({
          title: "Vendor Updated",
          description: "Vendor has been updated successfully.",
        });
        setShowEditModal(false);
      } else {
        await createVendor(formData);
        toast({
          title: "Vendor Added",
          description: "New vendor has been added successfully.",
        });
        setShowAddModal(false);
      }
      
      // Refresh vendors data
      await executeWithLoading(fetchVendors, { isRefresh: true, preserveData: true });
      
      // Reset form after successful operation
      resetForm();
      
    } catch (error) {
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save vendor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code || '',
      name: vendor.name || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
      specialization: vendor.specialization || '',
      is_active: vendor.is_active,
      notes: vendor.notes || ''
    });
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setShowViewModal(true);
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        const result = await deleteVendor(id);
        if (result.success) {
          await executeWithLoading(fetchVendors, { isRefresh: true, preserveData: true });
          toast({
            title: "Vendor Deleted",
            description: "Vendor has been deleted successfully.",
          });
        } else {
          toast({
            title: "Cannot Delete Vendor",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete vendor.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddVendor = useCallback(() => {
    const vendorCode = generateVendorCode();
    setFormData({
      ...defaultFormData,
      vendor_code: vendorCode
    });
    setSelectedVendor(null);
    setShowAddModal(true);
  }, [generateVendorCode, defaultFormData]);

  const handleCancelForm = useCallback(() => {
    setIsSubmitting(false);
    if (selectedVendor) {
      setShowEditModal(false);
    } else {
      setShowAddModal(false);
    }
    resetForm();
  }, [selectedVendor, resetForm]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && vendor.is_active) ||
                           (statusFilter === 'inactive' && !vendor.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + itemsPerPage);

  const stats = useMemo(() => [
    {
      title: 'Total Vendors',
      value: vendors.length,
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Active Vendors',
      value: vendors.filter(v => v.is_active).length,
      icon: Building2,
      color: 'text-green-600'
    },
    {
      title: 'Inactive Vendors',
      value: vendors.filter(v => !v.is_active).length,
      icon: Building2,
      color: 'text-red-600'
    }
  ], [vendors]);

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Background refresh indicator */}
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
          <p className="text-muted-foreground">Manage saree suppliers and vendors</p>
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
            onClick={handleAddVendor}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search vendors..."
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

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors ({filteredVendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">VENDOR</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">CONTACT</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">LOCATION</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">SPECIALIZATION</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">STATUS</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">CREATED</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-sm text-muted-foreground">{vendor.vendor_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        {vendor.contact_person && (
                          <p className="text-sm font-medium">{vendor.contact_person}</p>
                        )}
                        {vendor.phone && (
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {vendor.phone}
                          </p>
                        )}
                        {vendor.email && (
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {vendor.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        {vendor.city && vendor.state && (
                          <p className="text-sm">{vendor.city}, {vendor.state}</p>
                        )}
                        {vendor.pincode && (
                          <p className="text-sm text-muted-foreground">{vendor.pincode}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{vendor.specialization || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{new Date(vendor.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(vendor)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(vendor.id)}
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredVendors.length)} of {filteredVendors.length} entries
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Modal */}
      <Dialog 
        open={showAddModal} 
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setShowAddModal(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm
            formData={formData}
            onFormChange={handleFormChange}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
            isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Modal */}
      <Dialog 
        open={showEditModal} 
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setShowEditModal(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm
            formData={formData}
            onFormChange={handleFormChange}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* View Vendor Modal */}
      <Dialog 
        open={showViewModal} 
        onOpenChange={(open) => {
          if (!open) {
            setShowViewModal(false);
            setSelectedVendor(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Vendor Code</Label>
                  <p className="text-lg font-medium">{selectedVendor?.vendor_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Vendor Name</Label>
                  <p className="text-lg font-medium">{selectedVendor?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
                  <p className="text-sm">{selectedVendor?.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Specialization</Label>
                  <p className="text-sm">{selectedVendor?.specialization || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={selectedVendor?.is_active ? 'default' : 'secondary'}>
                    {selectedVendor?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-sm">{selectedVendor?.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedVendor?.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-sm">{selectedVendor?.address || 'N/A'}</p>
                  <p className="text-sm">{selectedVendor?.city}, {selectedVendor?.state} - {selectedVendor?.pincode}</p>
                </div>
                {selectedVendor?.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedVendor.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorManagement;
