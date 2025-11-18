// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { getOrdersForAdmin } from '@/lib/api-admin';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Row {
  id: string;
  order_id: string;
  status: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
  customer_name?: string;
  amount?: number;
}

const PendingCancelledOrders: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Row[] | null>(null);
  const { toast } = useToast();

  const fetchRows = async (override?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string }) => {
    setLoading(true);
    try {
      const sDate = override?.startDate ?? startDate;
      const eDate = override?.endDate ?? endDate;
      const sTime = override?.startTime ?? startTime;
      const eTime = override?.endTime ?? endTime;

      // Build date filters
      let startDateFilter = sDate;
      let endDateFilter = eDate;
      
      if (sDate && sTime) {
        const sd = new Date(sDate);
        const [h, m] = sTime.split(':');
        sd.setHours(parseInt(h), parseInt(m), 0, 0);
        startDateFilter = sd.toISOString();
      } else if (sDate) {
        const sd = new Date(sDate);
        sd.setHours(0, 0, 0, 0);
        startDateFilter = sd.toISOString();
      }
      
      if (eDate && eTime) {
        const ed = new Date(eDate);
        const [h, m] = eTime.split(':');
        ed.setHours(parseInt(h), parseInt(m), 59, 999);
        endDateFilter = ed.toISOString();
      } else if (eDate) {
        const ed = new Date(eDate);
        ed.setHours(23, 59, 59, 999);
        endDateFilter = ed.toISOString();
      }

      // Fetch pending and cancelled orders separately (API supports single status filter)
      const allRows: any[] = [];
      let page = 1;
      const pageSize = 100;

      for (const status of ['pending', 'cancelled']) {
        let hasMore = true;
        page = 1;

        while (hasMore) {
          const filters: any = {
            page,
            size: pageSize,
            statusFilter: status,
          };

          if (startDateFilter) {
            filters.start_date = startDateFilter;
          }
          if (endDateFilter) {
            filters.end_date = endDateFilter;
          }

          const result = await getOrdersForAdmin(filters);
          
          if (result && result.orders && result.orders.length > 0) {
            allRows.push(...result.orders);
            
            // Check if there are more pages
            if (result.orders.length < pageSize || page >= result.pages) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
      }

      // Sort by created_at descending
      allRows.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setRows(allRows);
      setCurrentPage(1);
      setSelectedIds([]);
    } catch (e) {
      console.error('Error fetching orders:', e);
      toast({ title: 'Load failed', description: 'Could not load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      String(r.order_id || '').toLowerCase().includes(q) ||
      String(r.customer_name || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Add pagination for filtered orders with increased page size
  const pagination = usePagination(filtered, 1000);

  const allFilteredSelected = pagination.paginatedData.length > 0 && pagination.paginatedData.every(r => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    const ids = pagination.paginatedData.map(r => r.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter(id => !ids.includes(id)) : Array.from(new Set([...selectedIds, ...ids])));
  };

  const deleteOrders = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      setLoading(true);
      
      // Delete orders via Python API
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
      
      // Delete each order individually (bulk delete not yet implemented)
      for (const id of ids) {
        try {
          // Find the order to get order_id
          const order = rows.find(r => r.id === id);
          if (order && order.order_id) {
            await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(order.order_id)}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (err) {
          console.error(`Error deleting order ${id}:`, err);
        }
      }
      
      toast({ title: 'Deleted', description: `Deleted ${ids.length} order(s)` });
      setConfirmDelete(null);
      setSelectedIds([]);
      // Refresh from server
      await fetchRows();
    } catch (e) {
      console.error('Error deleting orders:', e);
      toast({ title: 'Delete failed', description: 'Could not delete selected orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pending & Cancelled Orders</h1>
          <p className="text-muted-foreground">Orders with status Pending or Cancelled</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={allFilteredSelected ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (allFilteredSelected) {
                setSelectedIds([]);
              } else {
                setSelectedIds(filtered.map(r => r.id));
              }
            }}
            disabled={loading || filtered.length === 0}
            title={allFilteredSelected ? 'Clear selection' : 'Select all filtered results'}
          >
            {allFilteredSelected ? `Clear Selection (${selectedIds.length})` : `Select All (${filtered.length})`}
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => {
              const chosen = rows.filter(r => selectedIds.includes(r.id));
              setConfirmDelete(chosen);
            }} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchRows()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search by Order ID or Customer" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-32" />
            </div>
            <Button variant="outline" onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setStartTime(''); setEndTime(''); fetchRows({ startDate:'', endDate:'', startTime:'', endTime:'' }); }}>Clear</Button>
            <Button onClick={() => fetchRows()}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={pagination.paginatedData.length > 0 && pagination.paginatedData.every(r => selectedIds.includes(r.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Last Update</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                      />
                    </td>
                    <td className="p-3 font-mono">{r.order_id}</td>
                    <td className="p-3">{r.customer_name || 'N/A'}</td>
                    <td className="p-3 capitalize">{r.status}</td>
                    <td className="p-3 capitalize">{r.payment_status || 'N/A'}</td>
                    <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</td>
                    <td className="p-3">{r.amount ? `₹${Number(r.amount).toLocaleString()}` : '—'}</td>
                    <td className="p-3">
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete([r])}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
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

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          {confirmDelete && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You are about to delete {confirmDelete.length} order(s). This action cannot be undone.</p>
              <div className="max-h-56 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Order ID</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmDelete.map(o => (
                      <tr key={o.id} className="border-b">
                        <td className="p-2 font-mono">{o.order_id}</td>
                        <td className="p-2 capitalize">{o.status}</td>
                        <td className="p-2">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => deleteOrders(confirmDelete.map(o => o.id))}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingCancelledOrders;


