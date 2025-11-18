import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminFilterContextType {
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
}

const AdminFilterContext = createContext<AdminFilterContextType | undefined>(undefined);

export const useAdminFilters = () => {
  const context = useContext(AdminFilterContext);
  if (context === undefined) {
    throw new Error('useAdminFilters must be used within an AdminFilterProvider');
  }
  return context;
};

interface AdminFilterProviderProps {
  children: ReactNode;
}

export const AdminFilterProvider: React.FC<AdminFilterProviderProps> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  return (
    <AdminFilterContext.Provider
      value={{
        selectedYear,
        selectedMonth,
        setSelectedYear,
        setSelectedMonth,
      }}
    >
      {children}
    </AdminFilterContext.Provider>
  );
};
