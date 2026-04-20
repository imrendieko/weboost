import { useEffect, useMemo, useState } from 'react';

interface DataTablePaginationProps {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowsPerPageOptions?: number[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function DataTablePagination({ totalItems, currentPage, rowsPerPage, onPageChange, onRowsPerPageChange, rowsPerPageOptions = [10, 25, 50] }: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safePage = clamp(currentPage, 1, totalPages);

  const [gotoInput, setGotoInput] = useState(String(safePage));

  useEffect(() => {
    setGotoInput(String(safePage));
  }, [safePage]);

  const startRow = useMemo(() => {
    if (totalItems === 0) {
      return 0;
    }

    return (safePage - 1) * rowsPerPage + 1;
  }, [safePage, rowsPerPage, totalItems]);

  const endRow = useMemo(() => {
    if (totalItems === 0) {
      return 0;
    }

    return Math.min(safePage * rowsPerPage, totalItems);
  }, [safePage, rowsPerPage, totalItems]);

  const handleGotoSubmit = () => {
    const nextPage = Number(gotoInput);
    if (Number.isNaN(nextPage)) {
      setGotoInput(String(safePage));
      return;
    }

    onPageChange(clamp(nextPage, 1, totalPages));
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-gray-900/50 px-3 py-2 text-xs text-gray-300 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-2">
          <span>Go to page:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={gotoInput}
            onChange={(event) => setGotoInput(event.target.value)}
            onBlur={handleGotoSubmit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleGotoSubmit();
              }
            }}
            className="h-8 w-14 rounded-md border border-white/15 bg-black/20 px-2 text-center text-white outline-none focus:border-[#0080FF]"
          />
        </label>

        <label className="flex items-center gap-2">
          <span>Show rows:</span>
          <select
            value={rowsPerPage}
            onChange={(event) => {
              onRowsPerPageChange(Number(event.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-md border border-white/15 bg-black/20 px-2 text-white outline-none focus:border-[#0080FF]"
          >
            {rowsPerPageOptions.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </label>

        <span>
          {startRow}-{endRow} of {totalItems}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <span aria-hidden="true">&lt;</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
    </div>
  );
}
