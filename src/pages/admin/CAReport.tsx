// @ts-nocheck
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllOrdersForAdmin, getPincodesData } from '@/lib/api-admin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';

interface CAOrderRow {
  order_id: string;
  created_at: string;
  amount: number;
  pincode?: string | number | null;
  state?: string | null;
}

const CAReport: React.FC = () => {
  const [rows, setRows] = useState<CAOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [filteredRows, setFilteredRows] = useState<CAOrderRow[]>([]);
  const [stateFilter, setStateFilter] = useState('all');
  const { toast } = useToast();

  // Use pagination hook
  const pagination = usePagination(filteredRows, 50);

  const fetchPaidOrders = async (overrides?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string }) => {
    setIsLoading(true);
    try {
      // Date-time filtering
      const sDate = overrides?.startDate ?? startDate;
      const eDate = overrides?.endDate ?? endDate;
      const sTime = overrides?.startTime ?? startTime;
      const eTime = overrides?.endTime ?? endTime;

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

      // Fetch all orders using Python API with filters
      const allOrdersRaw = await getAllOrdersForAdmin({
        startDate: startDateFilter,
        endDate: endDateFilter,
      });

      // Filter by status and map to required format
      const allOrders = allOrdersRaw
        .filter((o: any) => ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'].includes(o.status))
        .map((o: any) => ({
          order_id: o.order_id,
          created_at: o.created_at,
          amount: o.amount || o.total || o.total_amount || 0,
          shipping_address: o.shipping_address,
        }));

      const parsed: CAOrderRow[] = allOrders.map((o: any) => ({
        order_id: o.order_id,
        created_at: o.created_at,
        amount: Number(o.amount || 0),
        pincode: extractPincode(o.shipping_address),
        state: extractStateFromAddress(o.shipping_address)
      }));

      // Enrich with state using pincodes table
      try {
        const uniquePins = Array.from(new Set(parsed.map(r => (r.pincode ? String(r.pincode) : '').trim()).filter(Boolean)));
        if (uniquePins.length > 0) {
          const pinRows = await getPincodesData(uniquePins);
          const pinMap = new Map<string, string>();
          (pinRows || []).forEach((pr: any) => pinMap.set(String(pr.pincode), pr.state));
          parsed.forEach(r => {
            const key = r.pincode ? String(r.pincode) : '';
            if (key && pinMap.has(key)) r.state = pinMap.get(key) || null;
          });
        }
      } catch (_) {}
      setRows(parsed);
      setFilteredRows(parsed);
    } catch (e) {
      toast({ title: 'Load Failed', description: 'Could not load confirmed orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter rows based on state filter
  useEffect(() => {
    if (stateFilter === 'all') {
      setFilteredRows(rows);
    } else {
      setFilteredRows(rows.filter(row => row.state === stateFilter));
    }
  }, [rows, stateFilter]);

  useEffect(() => {
    fetchPaidOrders();
  }, []);

  const extractPincode = (address?: string | null) => {
    if (!address) return null;
    const match = String(address).match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  };

  const extractStateFromAddress = (address?: string | null): string | null => {
    if (!address) return null;
    const knownStates = [
      'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
      'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
    ];
    const lower = address.toLowerCase();
    for (const s of knownStates) {
      if (lower.includes(s.toLowerCase())) return s;
    }
    const pin = extractPincode(address);
    if (pin) {
      const idx = address.indexOf(pin);
      if (idx > -1) {
        const before = address.slice(0, idx).split(',').map(t => t.trim()).filter(Boolean);
        if (before.length >= 1) {
          const candidate = before[before.length - 1];
          if (candidate && candidate.length >= 2 && candidate.length <= 40) return candidate;
        }
      }
    }
    return null;
  };


  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => ({
      'S.No': idx + 1,
      'Order ID': r.order_id,
      'Date': new Date(r.created_at).toLocaleString(),
      'Amount': r.amount,
      'Pincode': r.pincode || 'N/A',
      'State': r.state || 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    // Append total row
    const total = filteredRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    XLSX.utils.sheet_add_aoa(worksheet, [[ '', '', '', 'Total', total, '' ]], { origin: -1 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Omaguv Paid Orders');
    // Summary sheet
    const period = periodLabel;
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Period', Value: period },
      { Metric: 'State Filter', Value: stateFilter === 'all' ? 'All' : stateFilter },
      { Metric: 'Total Orders', Value: filteredRows.length },
      { Metric: 'Total Amount', Value: total }
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.writeFile(workbook, `omaguv-paid-orders-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({ title: 'Excel Exported', description: 'CA report exported to Excel' });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setProperties({ title: 'Omaguv Paid Orders Report', author: 'O Maguva Admin' });
    doc.setFontSize(14);
    doc.text('Omaguv Paid Orders', 14, 14);
    doc.setFontSize(10);
    const total = filteredRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    // Build date-only period for PDF (no time)
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;
    const periodDateOnly = sd && ed
      ? `${sd.toLocaleDateString()} to ${ed.toLocaleDateString()}`
      : sd
        ? `From ${sd.toLocaleDateString()}`
        : ed
          ? `Until ${ed.toLocaleDateString()}`
          : 'All time';
    const summary1 = `Generated: ${new Date().toLocaleDateString()} | Total Orders: ${filteredRows.length}`;
    const summary2 = `Period: ${periodDateOnly} | Total Amount: ₹${total.toLocaleString()}`;
    doc.text(summary1, 14, 20);
    doc.text(summary2, 14, 25);

    const head = [['S.No', 'Order ID', 'Date', 'Amount', 'Pincode', 'State']];
    const body = filteredRows.map((r, idx) => [
      idx + 1,
      r.order_id,
      new Date(r.created_at).toLocaleDateString(),
      `₹${Number(r.amount).toLocaleString()}`,
      r.pincode || 'N/A',
      r.state || 'N/A'
    ]);

    autoTable(doc, {
      startY: 30,
      head,
      body,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [240,240,240], textColor: 20 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 48 },
        2: { cellWidth: 48 },
        3: { cellWidth: 28 },
        4: { cellWidth: 26 },
        5: { cellWidth: 26 }
      }
    });

    // Totals footer
    const finalY = (doc as any).lastAutoTable?.finalY || 30;
    doc.setFontSize(10);
    doc.text(`Total Amount: ₹${total.toLocaleString()}`, 14, finalY + 8);

    const fileName = `omaguv-paid-orders-${new Date().toISOString().slice(0,10)}.pdf`;
    try {
      doc.save(fileName);
    } catch {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
    }
    toast({ title: 'PDF Exported', description: 'CA report exported to PDF' });
  };

  const periodLabel = (() => {
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;
    if (sd) {
      if (startTime) {
        const [h, m] = startTime.split(':');
        sd.setHours(parseInt(h), parseInt(m), 0, 0);
      } else sd.setHours(0,0,0,0);
    }
    if (ed) {
      if (endTime) {
        const [h, m] = endTime.split(':');
        ed.setHours(parseInt(h), parseInt(m), 59, 999);
      } else ed.setHours(23,59,59,999);
    }
    if (sd && ed) return `${sd.toLocaleString()} to ${ed.toLocaleString()}`;
    if (sd) return `From ${sd.toLocaleString()}`;
    if (ed) return `Until ${ed.toLocaleString()}`;
    return 'All time';
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Omaguv Paid Orders</h1>
          <p className="text-muted-foreground">Paid orders with Order ID, Date, Amount, and Pincode</p>
          <div className="text-sm text-muted-foreground mt-1">
            Period: {periodLabel} • Total Amount: <span className="text-foreground font-medium">₹{rows.reduce((s, r) => s + Number(r.amount || 0), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPaidOrders} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
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
            <div className="flex items-center gap-2">
              <Label>State</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {Array.from(new Set(rows.map(r => (r.state || '').trim()).filter(Boolean))).sort().map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(''); setEndDate(''); setStartTime(''); setEndTime('');
                setStateFilter('all');
                // Immediately fetch full, unfiltered data using overrides to avoid stale state
                fetchPaidOrders({ startDate: '', endDate: '', startTime: '', endTime: '' });
              }}
            >
              Clear
            </Button>
            <Button onClick={fetchPaidOrders} disabled={isLoading}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmed Orders ({filteredRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground w-16">S.No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Pincode</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">State</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.map((r, idx) => (
                  <tr key={r.order_id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{pagination.startIndex + idx + 1}</td>
                    <td className="p-3 font-mono">{r.order_id}</td>
                    <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3">₹{Number(r.amount).toLocaleString()}</td>
                    <td className="p-3">{r.pincode || 'N/A'}</td>
                    <td className="p-3">{r.state || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.startIndex + 1} to {pagination.endIndex} of {pagination.totalItems} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrevPage}>
                  Previous
                </Button>
                {(() => {
                  const maxButtons = 7;
                  const half = Math.floor(maxButtons / 2);
                  let start = Math.max(1, pagination.currentPage - half);
                  let end = Math.min(pagination.totalPages, start + maxButtons - 1);
                  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
                  const pages: number[] = [];
                  for (let p = start; p <= end; p++) pages.push(p);
                  return pages.map((page) => (
                    <Button key={page} variant={pagination.currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => pagination.goToPage(page)}>
                      {page}
                    </Button>
                  ));
                })()}
                <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNextPage}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CAReport;


