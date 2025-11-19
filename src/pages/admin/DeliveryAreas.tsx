// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { getDeliveryAreas, createDeliveryArea, updateDeliveryArea, deleteDeliveryArea } from '@/lib/api-admin';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';

/**
 * Admin delivery areas manager
 * - Keeps input state local while editing/adding to prevent flicker
 * - Only updates the list after save/delete operations complete
 */

type DeliveryArea = {
  id: string;
  pincode: string;
  area: string;
  city?: string;
  state?: string;
  country?: string;
};

const DeliveryAreasAdmin: React.FC = () => {
  const { toast } = useToast();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for creating a new area (isolated so typing doesn't get overwritten)
  const [newItem, setNewItem] = useState<{ pincode: string; area: string; city?: string; state?: string }>({
    pincode: '',
    area: '',
    city: '',
    state: ''
  });
  const [adding, setAdding] = useState(false);

  // Local edit state keyed by id to avoid list-driven controlled-value flicker
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ pincode: string; area: string; city?: string; state?: string }>({
    pincode: '',
    area: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryAreas();
      const allAreas = data.map((item: any) => ({
        id: String(item.pincode || ''),
        pincode: String(item.pincode || ''),
        area: item.area || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || 'India',
      }));
      allAreas.sort((a, b) => a.pincode.localeCompare(b.pincode));
      setAreas(allAreas);
      setFilteredAreas(allAreas);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load delivery areas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredAreas(areas);
    } else {
      const filtered = areas.filter(area =>
        String(area.pincode || '').toLowerCase().includes(term.toLowerCase()) ||
        String(area.area || '').toLowerCase().includes(term.toLowerCase()) ||
        (area.city && String(area.city).toLowerCase().includes(term.toLowerCase())) ||
        (area.state && String(area.state).toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredAreas(filtered);
    }
  };

  // Pagination setup with increased items per page for large datasets
  const pagination = usePagination(filteredAreas, 50);

  const handleStartEdit = (area: DeliveryArea) => {
    setEditingId(area.id);
    // copy into local edit state — typing will update this object only
    setEditValues({
      pincode: area.pincode ? String(area.pincode) : '',
      area: area.area || '',
      city: area.city || '',
      state: area.state || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ pincode: '', area: '', city: '', state: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const payload = {
      pincode: editValues.pincode.trim(),
      area: editValues.area.trim(),
      city: editValues.city?.trim() || null,
      state: editValues.state?.trim() || null
    };
    if (!payload.pincode || !payload.area) {
      toast({ title: 'Validation', description: 'Pincode and Area are required', variant: 'destructive' });
      return;
    }
    
    // Optimistic update for faster UI
    const optimisticAreas = areas.map(a => (a.id === editingId ? { ...a, ...payload } as DeliveryArea : a));
    setAreas(optimisticAreas);
    handleSearch(searchTerm);
    handleCancelEdit();
    toast({ title: 'Updating...', description: 'Delivery area being updated' });
    
    try {
      await updateDeliveryArea(editingId, payload);
      toast({ title: 'Saved', description: 'Delivery area updated successfully' });
    } catch (err) {
      // Revert optimistic update on error
      setAreas(areas);
      handleSearch(searchTerm);
      toast({ title: 'Error', description: 'Failed to save delivery area', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this delivery area?')) return;
    try {
      await deleteDeliveryArea(id);
      const updatedAreas = areas.filter(a => a.id !== id);
      setAreas(updatedAreas);
      handleSearch(searchTerm); // Reapply search filter
      if (editingId === id) handleCancelEdit();
      toast({ title: 'Deleted', description: 'Delivery area removed' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete delivery area', variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    const payload = {
      pincode: newItem.pincode.trim(),
      area: newItem.area.trim(),
      city: newItem.city?.trim() || null,
      state: newItem.state?.trim() || null,
      country: 'India' // Default country set to India
    };
    if (!payload.pincode || !payload.area) {
      toast({ title: 'Validation', description: 'Pincode and Area are required', variant: 'destructive' });
      return;
    }
    try {
      setAdding(true);
      const data = await createDeliveryArea(payload);
      // append new area to local list so UI stays stable
      const newArea: DeliveryArea = {
        id: String(data.pincode || ''),
        pincode: String(data.pincode || ''),
        area: data.area || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || 'India',
      };
      const updatedAreas = [...areas, newArea];
      setAreas(updatedAreas);
      handleSearch(searchTerm); // Reapply search filter
      setNewItem({ pincode: '', area: '', city: '', state: '' });
      toast({ title: 'Added', description: 'Delivery area added' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add delivery area', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Section */}
            <div className="mb-6">
              <Label>Search Delivery Areas</Label>
              <Input
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by pincode, area, city, or state..."
                className="max-w-md"
                aria-label="Search delivery areas"
              />
            </div>

            {/* Add New Area Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Add New Delivery Area</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <Label>Pincode</Label>
                <Input
                  value={newItem.pincode}
                  onChange={(e) => setNewItem(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="e.g. 560001"
                  aria-label="New pincode"
                />
              </div>
              <div>
                <Label>Area</Label>
                <Input
                  value={newItem.area}
                  onChange={(e) => setNewItem(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="Area name"
                  aria-label="New area"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={newItem.city || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City (optional)"
                  aria-label="New city"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={newItem.state || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State (optional)"
                  aria-label="New state"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAdd} disabled={adding} aria-label="Add delivery area">
                  {adding ? 'Adding...' : 'Add Area'}
                </Button>
                <Button variant="outline" onClick={() => setNewItem({ pincode: '', area: '', city: '', state: '' })}>
                  Clear
                </Button>
              </div>
            </div>
            </div>

            {/* Results Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  Delivery Areas - Total: {areas.length} records
                  {searchTerm && ` (${filteredAreas.length} filtered)`}
                </h3>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleSearch('')}
                    size="sm"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
              
              {loading && (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading delivery areas...
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full table-auto border border-border rounded-lg">
                  <thead>
                    <tr className="text-left bg-muted">
                      <th className="p-2 sm:p-3 font-semibold text-xs sm:text-sm">Pincode</th>
                      <th className="p-2 sm:p-3 font-semibold text-xs sm:text-sm">Area</th>
                      <th className="p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden sm:table-cell">City</th>
                      <th className="p-2 sm:p-3 font-semibold text-xs sm:text-sm hidden md:table-cell">State</th>
                      <th className="p-2 sm:p-3 font-semibold text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                    ) : pagination.paginatedData.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">
                        {searchTerm ? 'No delivery areas match your search' : 'No delivery areas found'}
                      </td></tr>
                    ) : (
                      pagination.paginatedData.map(area => (
                        <tr key={area.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">
                            {editingId === area.id ? (
                              <Input
                                value={editValues.pincode}
                                onChange={(e) => setEditValues(prev => ({ ...prev, pincode: e.target.value }))}
                                aria-label={`Edit pincode for ${area.area}`}
                                className="text-xs sm:text-sm"
                              />
                            ) : (
                              area.pincode || ''
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">
                            {editingId === area.id ? (
                              <Input
                                value={editValues.area}
                                onChange={(e) => setEditValues(prev => ({ ...prev, area: e.target.value }))}
                                aria-label={`Edit area name for ${area.pincode}`}
                                className="text-xs sm:text-sm"
                              />
                            ) : (
                              area.area
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            {editingId === area.id ? (
                              <Input
                                value={editValues.city || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, city: e.target.value }))}
                                aria-label={`Edit city for ${area.area}`}
                                className="text-xs sm:text-sm"
                              />
                            ) : (
                              <span className="text-muted-foreground">{area.city || '-'}</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {editingId === area.id ? (
                              <Input
                                value={editValues.state || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, state: e.target.value }))}
                                aria-label={`Edit state for ${area.area}`}
                                className="text-xs sm:text-sm"
                              />
                            ) : (
                              <span className="text-muted-foreground">{area.state || '-'}</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              {editingId === area.id ? (
                                <>
                                  <Button onClick={handleSaveEdit} size="sm" className="text-xs">Save</Button>
                                  <Button variant="outline" onClick={handleCancelEdit} size="sm" className="text-xs">Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button onClick={() => handleStartEdit(area)} size="sm" className="text-xs">Edit</Button>
                                  <Button variant="destructive" onClick={() => handleDelete(area.id)} size="sm" className="text-xs">Delete</Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              
              {/* Pagination */}
              <TablePagination pagination={pagination} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAreasAdmin;
