// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSkeleton, BackgroundRefreshIndicator } from '@/components/ui/loading';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { 
  Search, 
  Truck, 
  Package, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Edit, 
  Eye,
  Phone,
  MapPin,
  Calendar,
  Save,
  RefreshCw
} from 'lucide-react';
import { getDeliveries, createDelivery, updateDelivery } from '@/lib/api-admin';
import type { Delivery } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<Delivery[]>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{deliveryId: string, status: string} | null>(null);

  const [editFormData, setEditFormData] = useState({
    courier_service: '',
    tracking_number: '',
    pickup_timestamp: '',
    delivery_timestamp: '',
    delivery_notes: '',
    status: ''
  });

  const [courierFormData, setCourierFormData] = useState({
    courier_service: '',
    tracking_number: ''
  });

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchDeliveries, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, [executeWithLoading]);

  const fetchDeliveries = async () => {
    const data = await getDeliveries();
    setDeliveries(data);
    return data;
  };

  const handleRefresh = async () => {
    try {
      // This will show the background refresh indicator instead of full loading
      await executeWithLoading(fetchDeliveries, { isRefresh: true, preserveData: true });
      toast({
        title: "Data Refreshed",
        description: "Deliveries data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh deliveries data.",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (deliveryId: string, newStatus: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    // Check if status is being changed to "shipped"
    if (newStatus === 'shipped') {
      setPendingStatusUpdate({ deliveryId, status: newStatus });
      setSelectedDelivery(delivery);
      setCourierFormData({
        courier_service: delivery.courier_service || '',
        tracking_number: delivery.tracking_number || ''
      });
      setShowCourierModal(true);
      return;
    }

    try {
      await updateDelivery(deliveryId, { status: newStatus });
      await fetchDeliveries();
      toast({
        title: "Status Updated",
        description: "Delivery status has been updated successfully.",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to update delivery status.",
        variant: "destructive",
      });
    }
  };

  const handleCourierSubmit = async () => {
    if (!pendingStatusUpdate || !courierFormData.courier_service || !courierFormData.tracking_number) {
      toast({
        title: "Missing Information",
        description: "Please provide both courier service and tracking number.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update delivery details with courier information
      await updateDelivery(pendingStatusUpdate.deliveryId, {
        courier_service: courierFormData.courier_service,
        tracking_number: courierFormData.tracking_number,
        pickup_timestamp: new Date().toISOString(),
        status: pendingStatusUpdate.status
      });

      await fetchDeliveries();
      setShowCourierModal(false);
      setCourierFormData({ courier_service: '', tracking_number: '' });
      setPendingStatusUpdate(null);
      setSelectedDelivery(null);
      
      toast({
        title: "Delivery Updated",
        description: "Delivery status updated to shipped with courier details.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery with courier details.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setEditFormData({
      courier_service: delivery.courier_service || '',
      tracking_number: delivery.tracking_number || '',
      pickup_timestamp: '',
      delivery_timestamp: '',
      delivery_notes: '',
      // Ensure status is properly normalized to a string
      status: (delivery.status != null ? String(delivery.status) : 'pending')
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    // If status is being changed to "shipped", validate courier details
    if (editFormData.status === 'shipped' && (!editFormData.courier_service || !editFormData.tracking_number)) {
      toast({
        title: "Missing Information",
        description: "Courier service and tracking number are required for shipped status.",
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanedFormData = {
        courier_service: editFormData.courier_service || null,
        tracking_number: editFormData.tracking_number || null,
        status: editFormData.status,
        pickup_timestamp: editFormData.status === 'shipped' ? new Date().toISOString() : null,
        delivery_timestamp: editFormData.status === 'delivered' ? new Date().toISOString() : null
      };
      
      await updateDelivery(selectedDelivery.id, cleanedFormData);
      await fetchDeliveries();
      toast({
        title: "Details Updated",
        description: "Delivery details have been updated successfully.",
      });
      setShowEditModal(false);
      setSelectedDelivery(null);
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to update delivery details.",
        variant: "destructive",
      });
    }
  };

  const toggleCardExpansion = (deliveryId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(deliveryId)) {
      newExpanded.delete(deliveryId);
    } else {
      newExpanded.add(deliveryId);
    }
    setExpandedCards(newExpanded);
  };

  const handleViewDetail = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailModal(true);
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.delivery_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    const matchesCourier = courierFilter === 'all' || delivery.courier_service === courierFilter;
    return matchesSearch && matchesStatus && matchesCourier;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'shipped': return Truck;
      case 'pending': return Package;
      default: return Package;
    }
  };

  // Calculate stats based on actual data
  const stats = [
    {
      title: 'Total Deliveries',
      value: deliveries.length,
      icon: Package,
      color: 'text-blue-600',
      filter: 'all'
    },
    {
      title: 'Delivered',
      value: deliveries.filter(d => d.status === 'delivered').length,
      icon: CheckCircle,
      color: 'text-green-600',
      filter: 'delivered'
    },
    {
      title: 'Shipped',
      value: deliveries.filter(d => d.status === 'shipped').length,
      icon: Truck,
      color: 'text-blue-600',
      filter: 'shipped'
    },
    {
      title: 'Pending',
      value: deliveries.filter(d => d.status === 'pending').length,
      icon: Package,
      color: 'text-orange-600',
      filter: 'pending'
    }
  ];

  const uniqueCouriers = [...new Set(deliveries.map(d => d.courier_service).filter(Boolean))];
  const filteredCouriers = uniqueCouriers.filter(courier => courier && typeof courier === 'string' && courier.trim().length > 0);

  const handleStatCardClick = (filter: string) => {
    setStatusFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const DeliveryDetailModal = () => {
    if (!selectedDelivery) return null;

    const StatusIcon = getStatusIcon(selectedDelivery.status);

    return (
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <StatusIcon className="h-5 w-5" />
              <span>Delivery {selectedDelivery.delivery_id}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-1">
            {/* Status Update */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <StatusIcon className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Current Status</p>
                  <Badge className={getStatusColor(selectedDelivery.status)}>
                    {selectedDelivery.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <Select onValueChange={(value) => handleStatusUpdate(selectedDelivery.id, value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedDelivery.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedDelivery.customer_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedDelivery.customer_address}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Courier Service</p>
                    <p className="font-medium">{selectedDelivery.courier_service || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-medium">{selectedDelivery.tracking_number || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Courier Phone</p>
                    <p className="font-medium">{selectedDelivery.courier_phone || 'Not available'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <img 
                    src="https://images.pexels.com/photos/8148577/pexels-photo-8148577.jpeg" 
                    alt={selectedDelivery.product_name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{selectedDelivery.product_name}</p>
                    <p className="text-sm text-muted-foreground">Order: {selectedDelivery.order_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Delivery Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-muted-foreground">{new Date(selectedDelivery.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedDelivery.pickup_timestamp && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Picked Up</p>
                        <p className="text-sm text-muted-foreground">{new Date(selectedDelivery.pickup_timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedDelivery.estimated_delivery_date && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Estimated Delivery</p>
                        <p className="text-sm text-muted-foreground">{new Date(selectedDelivery.estimated_delivery_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedDelivery.delivery_timestamp && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Delivered</p>
                        <p className="text-sm text-muted-foreground">{new Date(selectedDelivery.delivery_timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!hasLoadedOnce && isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="p-6 space-y-6 relative">
      <BackgroundRefreshIndicator isRefreshing={isRefreshing} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Delivery Management</h1>
          <p className="text-muted-foreground">Track and manage order deliveries</p>
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
          <Button className="bg-primary text-primary-foreground">
            Schedule Pickup
          </Button>
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              statusFilter === stat.filter ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleStatCardClick(stat.filter)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
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
            placeholder="Search deliveries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
        <Select value={courierFilter} onValueChange={setCourierFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Couriers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Couriers</SelectItem>
            {filteredCouriers.map((courier) => (
              <SelectItem key={courier} value={courier}>
                {courier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deliveries Cards */}
      <div className="space-y-4">
        {paginatedDeliveries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Deliveries Found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' ? `No deliveries with status "${statusFilter.replace('_', ' ')}"` : 'No deliveries available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          paginatedDeliveries.map((delivery) => {
            const StatusIcon = getStatusIcon(delivery.status);
            const isExpanded = expandedCards.has(delivery.id);
            
            return (
              <div key={delivery.id} className="space-y-2">
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => toggleCardExpansion(delivery.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <StatusIcon className="h-6 w-6 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{delivery.delivery_id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {delivery.customer_name} • {delivery.product_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {delivery.courier_service ? `${delivery.courier_service} - ${delivery.tracking_number}` : 'Courier not assigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                        </Badge>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewDetail(delivery)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(delivery)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Expandable Details Table */}
                {isExpanded && (
                  <Card className="border-l-4 border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">Delivery Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b">
                              <td className="py-2 px-4 font-medium text-muted-foreground">Customer Name</td>
                              <td className="py-2 px-4">{delivery.customer_name}</td>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Customer Phone</td>
                              <td className="py-2 px-4">{delivery.customer_phone || 'N/A'}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-4 font-medium text-muted-foreground">Product</td>
                              <td className="py-2 px-4">{delivery.product_name}</td>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Order ID</td>
                              <td className="py-2 px-4">{delivery.order_id}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-4 font-medium text-muted-foreground">Courier Service</td>
                              <td className="py-2 px-4">{delivery.courier_service || 'Not assigned'}</td>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Tracking Number</td>
                              <td className="py-2 px-4">{delivery.tracking_number || 'Not available'}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-4 font-medium text-muted-foreground">Pickup Date</td>
                              <td className="py-2 px-4">
                                {delivery.pickup_timestamp ? new Date(delivery.pickup_timestamp).toLocaleString() : 'Not picked up'}
                              </td>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Estimated Delivery</td>
                              <td className="py-2 px-4">
                                {delivery.estimated_delivery_date ? new Date(delivery.estimated_delivery_date).toLocaleDateString() : 'Not set'}
                              </td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-4 font-medium text-muted-foreground">Delivery Date</td>
                              <td className="py-2 px-4">
                                {delivery.delivery_timestamp ? new Date(delivery.delivery_timestamp).toLocaleString() : 'Not delivered'}
                              </td>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Status</td>
                              <td className="py-2 px-4">
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(delivery.status)}>
                                    {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                                  </Badge>
                                  <Select onValueChange={(value) => handleStatusUpdate(delivery.id, value)}>
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Change Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="shipped">Shipped</SelectItem>
                                      <SelectItem value="delivered">Delivered</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2 px-4 font-medium text-muted-foreground">Customer Address</td>
                              <td className="py-2 px-4" colSpan={3}>{delivery.customer_address}</td>
                            </tr>
                            {/* @ts-ignore */}
                            {delivery.delivery_notes && (
                              <tr>
                                <td className="py-2 px-4 font-medium text-muted-foreground">Delivery Notes</td>
                                {/* @ts-ignore */}
                                <td className="py-2 px-4" colSpan={3}>{delivery.delivery_notes}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredDeliveries.length)} of {filteredDeliveries.length} entries
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

      {/* Courier Details Modal */}
      <Dialog open={showCourierModal} onOpenChange={setShowCourierModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Courier Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide courier service and tracking details for this delivery.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="courier_service">Courier Service *</Label>
              <Select 
                value={courierFormData.courier_service} 
                onValueChange={(value) => setCourierFormData(prev => ({ ...prev, courier_service: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select courier service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blue Dart">Blue Dart</SelectItem>
                  <SelectItem value="DTDC">DTDC</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="Delhivery">Delhivery</SelectItem>
                  <SelectItem value="Ecom Express">Ecom Express</SelectItem>
                  <SelectItem value="India Post">India Post</SelectItem>
                  <SelectItem value="Aramex">Aramex</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tracking_number">Tracking Number *</Label>
              <Input
                id="tracking_number"
                value={courierFormData.tracking_number}
                onChange={(e) => setCourierFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                placeholder="Enter tracking number"
                required
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCourierModal(false);
                  setCourierFormData({ courier_service: '', tracking_number: '' });
                  setPendingStatusUpdate(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCourierSubmit}
                className="bg-primary text-primary-foreground"
              >
                Ship Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Delivery Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Details - {selectedDelivery?.delivery_id}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editFormData.status || "pending"} onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editFormData.status === 'shipped' || editFormData.status === 'delivered') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_courier_service">Courier Service {editFormData.status === 'shipped' && '*'}</Label>
                    <Input
                      id="edit_courier_service"
                      value={editFormData.courier_service}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, courier_service: e.target.value }))}
                      placeholder="e.g., Blue Dart, DTDC, FedEx"
                      required={editFormData.status === 'shipped'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_tracking_number">Tracking Number {editFormData.status === 'shipped' && '*'}</Label>
                    <Input
                      id="edit_tracking_number"
                      value={editFormData.tracking_number}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                      placeholder="Enter tracking number"
                      required={editFormData.status === 'shipped'}
                    />
                  </div>
                </div>
              )}

              {editFormData.status === 'pending' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Pending Status:</strong> Order is waiting to be processed. No courier details required.
                  </p>
                </div>
              )}

              {editFormData.status === 'shipped' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Shipped Status:</strong> Courier service and tracking number are required.
                  </p>
                </div>
              )}

              {editFormData.status === 'delivered' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Delivered Status:</strong> Order has been successfully delivered to customer.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-4 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDelivery(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeliveryDetailModal />
    </div>
  );
};

export default DeliveryManagement;
