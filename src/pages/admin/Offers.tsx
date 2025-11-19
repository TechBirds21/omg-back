// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getOffers, createOffer, updateOffer, deleteOffer, getProductsForAdmin } from '@/lib/api-admin';
import { Plus, Edit, Trash2, Save, X, Package, ShoppingCart } from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string;
  offer_type: string;
  conditions: any;
  discount_percentage: number | null;
  discount_amount: number | null;
  minimum_quantity: number;
  maximum_quantity: number | null;
  applicable_categories: string[] | null;
  applicable_products: string[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  sku: string;
  is_active: boolean;
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_type: 'single_product_bulk',
    conditions: [{ min_quantity: 1, price: 0 }],
    applicable_products: [] as string[],
    start_date: '',
    end_date: '',
    is_active: true,
    priority: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch offers and products from backend
      const [offersData, productsData] = await Promise.all([
        getOffers(),
        getProductsForAdmin()
      ]);

      // Filter active products
      const activeProducts = productsData.filter((p: any) => p.is_active);

      setOffers(offersData || []);
      setProducts(activeProducts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter an offer title",
        variant: "destructive",
      });
      return;
    }

    if (formData.applicable_products.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    if (formData.conditions.length === 0 || formData.conditions.some(c => !c.min_quantity || !c.price)) {
      toast({
        title: "Error",
        description: "Please add valid pricing tiers",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const offerData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        offer_type: formData.offer_type,
        conditions: formData.conditions,
        applicable_products: formData.applicable_products,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        priority: formData.priority,
        minimum_quantity: Math.min(...formData.conditions.map(c => c.min_quantity)),
        maximum_quantity: null
      };

      if (editingOffer) {
        await updateOffer(editingOffer.id, offerData);
        toast({ title: "Success", description: "Offer updated successfully" });
      } else {
        await createOffer(offerData);
        toast({ title: "Success", description: "Offer created successfully" });
      }

      resetForm();
      fetchData();
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to save offer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      offer_type: offer.offer_type,
      conditions: offer.conditions || [{ min_quantity: 1, price: 0 }],
      applicable_products: offer.applicable_products || [],
      start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
      end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
      is_active: offer.is_active,
      priority: offer.priority
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;

    try {
      await deleteOffer(id);
      toast({ title: "Success", description: "Offer deleted successfully" });
      fetchData();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: 'single_product_bulk',
      conditions: [{ min_quantity: 1, price: 0 }],
      applicable_products: [],
      start_date: '',
      end_date: '',
      is_active: true,
      priority: 0
    });
    setEditingOffer(null);
    setIsCreating(false);
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { min_quantity: 1, price: 0 }]
    });
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: parseFloat(value) || 0 };
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    if (formData.conditions.length > 1) {
      const newConditions = formData.conditions.filter((_, i) => i !== index);
      setFormData({ ...formData, conditions: newConditions });
    }
  };

  const toggleProductSelection = (productName: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_products: prev.applicable_products.includes(productName)
        ? prev.applicable_products.filter(p => p !== productName)
        : [...prev.applicable_products, productName]
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Product Offers</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOffer ? 'Edit Offer' : 'Create New Product Offer'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Offer Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Buy 2 Get Discount"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="offer_type">Offer Type</Label>
                  <Select
                    value={formData.offer_type}
                    onValueChange={(value) => setFormData({ ...formData, offer_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_product_bulk">Single Product Bulk Pricing</SelectItem>
                      <SelectItem value="bundle_offer">Multi-Product Bundle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the offer..."
                />
              </div>

              {/* Product Selection */}
              <div>
                <Label>Select Products for this Offer</Label>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`product-${product.id}`}
                        checked={formData.applicable_products.includes(product.name)}
                        onChange={() => toggleProductSelection(product.name)}
                        className="rounded"
                      />
                      <label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer flex-1">
                        <div className="flex items-center space-x-2">
                          {product.images && product.images[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">₹{Number(product.price).toLocaleString()}</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                {formData.applicable_products.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Please select at least one product</p>
                )}
              </div>

              {/* Pricing Tiers */}
              <div>
                <Label>
                  {formData.offer_type === 'bundle_offer' ? 'Bundle Pricing' : 'Quantity Pricing Tiers'}
                </Label>
                {formData.conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center mt-2">
                    <Input
                      placeholder={formData.offer_type === 'bundle_offer' ? 'Products needed' : 'Min Quantity'}
                      value={condition.min_quantity}
                      onChange={(e) => updateCondition(index, 'min_quantity', e.target.value)}
                      type="number"
                      min="1"
                    />
                    <Input
                      placeholder="Price per item"
                      value={condition.price}
                      onChange={(e) => updateCondition(index, 'price', e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                    />
                    {formData.conditions.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addCondition} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add {formData.offer_type === 'bundle_offer' ? 'Bundle' : 'Tier'}
                </Button>
              </div>

              {/* Date Range and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    type="date"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    type="date"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingOffer ? 'Update' : 'Create'} Offer
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{offer.title}</h3>
                        <Badge variant={offer.is_active ? "default" : "secondary"}>
                          {offer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">Priority: {offer.priority}</Badge>
                        <Badge variant="outline" className="bg-blue-50">
                          {offer.offer_type === 'single_product_bulk' ? (
                            <>
                              <Package className="h-3 w-3 mr-1" />
                              Bulk Pricing
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Bundle
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {/* Offer Name Display */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg mb-3">
                        <h4 className="font-medium text-blue-800">{offer.title}</h4>
                        <p className="text-sm text-blue-600">
                          {offer.offer_type === 'single_product_bulk' 
                            ? `Buy ${offer.minimum_quantity}+ items for special pricing` 
                            : 'Bundle offer available'}
                        </p>
                      </div>
                    {offer.description && (
                      <p className="text-muted-foreground mb-2">{offer.description}</p>
                    )}
                    
                    {/* Show selected products */}
                    {offer.applicable_products && offer.applicable_products.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium">Products:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {offer.applicable_products.map((productName) => (
                            <Badge key={productName} variant="secondary" className="text-xs">
                              {productName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                      {offer.conditions.length > 0 && (
                        <span>
                          Pricing: {offer.conditions.map((c: any) => `${c.min_quantity}@₹${c.price}`).join(', ')}
                        </span>
                      )}
                      {offer.end_date && (
                        <span>Expires: {new Date(offer.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(offer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(offer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No offers created yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminOffers;
