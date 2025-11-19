import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationResult } from '@/hooks/usePagination';

interface TablePaginationProps<T> {
  pagination: PaginationResult<T>;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
  className?: string;
}

export function TablePagination<T>({ 
  pagination, 
  showItemsPerPage = true,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  className = ""
}: TablePaginationProps<T>) {
  const { 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex
  } = pagination;

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between px-2 py-4 ${className}`}>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {showItemsPerPage && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${itemsPerPage}`}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage >= 10000 ? 'All' : itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {itemsPerPageOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize === -1 ? 'All' : pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
        
        <p className="text-sm text-muted-foreground">
          {totalItems > 0 
            ? `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`
            : "No entries found"
          }
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => goToPage(1)}
          disabled={!hasPrevPage}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={prevPage}
          disabled={!hasPrevPage}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={nextPage}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => goToPage(totalPages)}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
