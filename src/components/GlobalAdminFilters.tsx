import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminFilters } from '@/contexts/AdminFilterContext';

export const GlobalAdminFilters: React.FC = () => {
  const { selectedYear, selectedMonth, setSelectedYear, setSelectedMonth } = useAdminFilters();

  return (
    <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm border">
      <div className="text-sm font-medium text-gray-700">Filter by:</div>
      
      {/* Year Filter */}
      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
        <SelectTrigger className="h-8 w-20 text-xs">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 3 }, (_, i) => {
            const year = 2025 + i;
            return (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Month Filter */}
      <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">January</SelectItem>
          <SelectItem value="2">February</SelectItem>
          <SelectItem value="3">March</SelectItem>
          <SelectItem value="4">April</SelectItem>
          <SelectItem value="5">May</SelectItem>
          <SelectItem value="6">June</SelectItem>
          <SelectItem value="7">July</SelectItem>
          <SelectItem value="8">August</SelectItem>
          <SelectItem value="9">September</SelectItem>
          <SelectItem value="10">October</SelectItem>
          <SelectItem value="11">November</SelectItem>
          <SelectItem value="12">December</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
