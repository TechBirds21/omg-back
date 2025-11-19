// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
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
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  DollarSign,
  Edit, 
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  X
} from 'lucide-react';
import { getCustomers, updateCustomer, deleteCustomer, getCustomerOrders } from '@/lib/api-admin';
import type { Customer } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { toast } = useToast();

  // Use the new delayed loading hook
  const { 
    isLoading, 
    isRefreshing, 
    executeWithLoading 
  } = useDelayedLoading<Customer[]>({ minimumDelay: 300, preserveData: true });

  // Preserve scroll position during refreshes
  useScrollPreservation(isRefreshing);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    city: '',
    state: '',
    tier: 'Bronze',
    status: 'Active'
  });

  // Stable input change handlers for optimal performance
  const handleInputChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectChange = useCallback((field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    // Initial load - only run once on mount
    executeWithLoading(fetchCustomers, { isRefresh: false, preserveData: false })
      .then(() => {
        setHasLoadedOnce(true);
      })
      .catch(() => {
        // On error, don't set hasLoadedOnce so we can show loading skeleton on retry
      });
  }, []); // Empty dependency array - this should only run once on mount

  const fetchCustomers = async (): Promise<Customer[]> => {
    // Fetch customers
    const customersData = await getCustomers();
    
    // Enhance customer data with order information (fetch orders per customer if needed)
    const enhancedCustomers = await Promise.all(customersData.map(async (customer) => {
      let customerOrders: any[] = [];
      try {
        customerOrders = await getCustomerOrders(customer.id);
      } catch (error) {
        // If customer has no orders or error, continue with empty array
      }
      
      return {
        ...customer,
        total_orders: customerOrders.length,
        total_spent: customerOrders.reduce((sum, order) => sum + parseFloat(String(order.amount) || '0'), 0),
        last_order_date: customerOrders.length > 0 ? 
            new Date(Math.max(...customerOrders.map(o => new Date(o.created_at).getTime()))).toISOString() : null
        };
      }));

    // Get all orders to find customers not in customers table
    const { getAllOrdersForAnalytics } = await import('@/lib/api-admin');
    let ordersData: any[] = [];
    try {
      ordersData = await getAllOrdersForAnalytics();
    } catch (error) {
      // Continue without orders if fetch fails
    }
    
    // Also add customers from orders who might not be in customers table
    const orderCustomers = ordersData.reduce((acc: any, order) => {
      const existingCustomer = enhancedCustomers.find(c => 
        c.email === order.customer_email || c.name === order.customer_name
      );
      
      if (!existingCustomer) {
        const key = order.customer_email || order.customer_name;
        if (!acc[key]) {
          acc[key] = {
            id: `order-${order.id}`,
            customer_id: `GUEST-${Date.now()}`,
            name: order.customer_name || 'Unknown Customer',
            email: order.customer_email || '',
            phone: order.customer_phone || '',
            location: order.shipping_address?.split(',')[0] || '',
            city: order.shipping_address?.split(',')[1] || '',
            state: order.shipping_address?.split(',')[2] || '',
            tier: 'Bronze',
            status: 'Active',
            total_orders: 0,
            total_spent: 0,
            joined_date: order.created_at,
            created_at: order.created_at,
            updated_at: order.created_at
          };
        }
        acc[key].total_orders += 1;
        acc[key].total_spent += parseFloat(String(order.amount) || '0');
      }
      return acc;
    }, {});

    const allCustomers: Customer[] = [...enhancedCustomers, ...Object.values(orderCustomers) as Customer[]];
    setCustomers(allCustomers);
    return allCustomers;
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      location: customer.location || '',
      city: customer.city || '',
      state: customer.state || '',
      // Ensure select field values are properly normalized to strings
      tier: (customer.tier != null ? String(customer.tier) : 'Bronze'),
      status: (customer.status != null ? String(customer.status) : 'Active')
    });
    setShowEditModal(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer) return;

    try {
      await updateCustomer(selectedCustomer.id, formData);
      // Refresh data in background without showing full loading
      await executeWithLoading(fetchCustomers, { isRefresh: true, preserveData: true });
      toast({
        title: "Customer Updated",
        description: "Customer information has been updated successfully.",
      });
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
        // Refresh data in background without showing full loading
        await executeWithLoading(fetchCustomers, { isRefresh: true, preserveData: true });
        toast({
          title: "Customer Deleted",
          description: "Customer has been deleted successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete customer.",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      city: '',
      state: '',
      tier: 'Bronze',
      status: 'Active'
    });
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesTier = tierFilter === 'all' || customer.tier === tierFilter;
    const matchesLocation = locationFilter === 'all' || customer.state === locationFilter;
    return matchesSearch && matchesStatus && matchesTier && matchesLocation;
  });

  // Use the new pagination hook
  const pagination = usePagination(filteredCustomers, 15);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const stats = [
    {
      title: 'Total Customers',
      value: customers.length,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Customers',
      value: customers.filter(c => c.status === 'Active').length,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Inactive Customers',
      value: customers.filter(c => c.status === 'Inactive').length,
      icon: UserX,
      color: 'text-red-600'
    },
    {
      title: 'Total Revenue',
      value: `₹${customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600'
    }
  ];

  const uniqueStates = [...new Set(customers.map(c => c.state).filter(Boolean))];
  const filteredStates = uniqueStates.filter(state => state && typeof state === 'string' && state.trim().length > 0);

  const CustomerModal = ({ isEdit = false, isView = false }) => (
    <Dialog 
      open={isEdit ? showEditModal : showViewModal} 
      onOpenChange={(open) => {
        if (!open) {
          if (isEdit) {
            setShowEditModal(false);
            resetForm();
          } else {
            setShowViewModal(false);
          }
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isView ? 'Customer Profile' : 'Edit Customer'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {isView ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                {selectedCustomer?.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedCustomer?.name}</h3>
                <p className="text-muted-foreground">{selectedCustomer?.customer_id}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getTierColor(selectedCustomer?.tier || '')}>
                    {selectedCustomer?.tier}
                  </Badge>
                  <Badge className={getStatusColor(selectedCustomer?.status || '')}>
                    {selectedCustomer?.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedCustomer?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedCustomer?.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedCustomer?.city}, {selectedCustomer?.state}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{selectedCustomer?.total_orders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">₹{selectedCustomer?.total_spent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined Date</p>
                  <p className="font-medium">{selectedCustomer?.joined_date ? new Date(selectedCustomer.joined_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  placeholder="Enter city"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={handleInputChange('state')}
                  placeholder="Enter state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select onValueChange={handleSelectChange('tier')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={handleSelectChange('status')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Update Customer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );

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
          <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Manage customer relationships and track engagement</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          Export Customers
        </Button>
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
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="Bronze">Bronze</SelectItem>
            <SelectItem value="Silver">Silver</SelectItem>
            <SelectItem value="Gold">Gold</SelectItem>
            <SelectItem value="Platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {filteredStates.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">CUSTOMER</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">CONTACT</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">LOCATION</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ORDERS & SPENDING</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">TIER & STATUS</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">LAST ACTIVITY</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{customer.city}, {customer.state}</p>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.total_orders} orders</p>
                        <p className="text-sm text-muted-foreground">₹{customer.total_spent.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <Badge className={getTierColor(customer.tier)}>
                          {customer.tier}
                        </Badge>
                        <Badge className={getStatusColor(customer.status)}>
                          {customer.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm">{new Date(customer.created_at).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(customer.joined_date).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
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
          <TablePagination pagination={pagination} />
        </CardContent>
      </Card>

      <CustomerModal isEdit={true} isView={false} />
      <CustomerModal isEdit={false} isView={true} />
    </div>
  );
};

export default CustomerManagement;
