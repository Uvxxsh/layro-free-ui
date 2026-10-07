"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";

const SQUIRCLE = "[corner-shape:squircle]";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Checkbox({
  checked,
  onCheckedChange,
  ...props
}: {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange">) {
  return (
    <input
      {...props}
      type="checkbox"
      checked={checked === true}
      ref={(node) => {
        if (node) {
          node.indeterminate = checked === "indeterminate";
        }
      }}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "size-4 cursor-pointer rounded border border-input accent-primary",
        props.className,
      )}
    />
  );
}

function SearchInput({
  value,
  onValueChange,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...props}
      type="search"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "h-9 w-full rounded-[10px] border border-input bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
        props.className,
      )}
    />
  );
}

function Pagination({
  label,
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
}: {
  label: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total: number;
  pageSize: number;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3"
    >
      <span className="text-[12px] text-muted-foreground">
        {start}–{end} of {total}
      </span>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>

        <span className="px-2 text-[12px] text-muted-foreground">
          {page} / {pageCount}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <p className="text-[13px] font-medium text-foreground">{title}</p>

      {description && (
        <p className="text-[12px] text-muted-foreground">{description}</p>
      )}

      {action}
    </div>
  );
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right" | "center";
    width?: number;
    label?: string;
  }
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];

  searchPlaceholder?: string;

  selectable?: boolean;

  bulkActions?: (rows: T[]) => React.ReactNode;

  onSelectionChange?: (rows: T[]) => void;

  pageSize?: number;

  columnToggle?: boolean;

  getRowId?: (row: T, index: number) => string;

  onRowClick?: (row: T) => void;

  density?: "compact" | "comfortable";

  empty?: React.ReactNode;

  label?: string;

  className?: string;
}

export function DataTable<T>({
  data,
  columns: userColumns,
  searchPlaceholder,
  selectable = false,
  bulkActions,
  onSelectionChange,
  pageSize = 10,
  columnToggle = false,
  getRowId,
  onRowClick,
  density = "comfortable",
  empty,
  label = "Table",
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] =
    React.useState<RowSelectionState>({});
  const [visibility, setVisibility] =
    React.useState<VisibilityState>({});
  const [columnMenuOpen, setColumnMenuOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<T, any>[]>(() => {
    if (!selectable) return userColumns;

    const select: ColumnDef<T, any> = {
      id: "__select",
      enableSorting: false,
      enableHiding: false,
      meta: { width: 44 },

      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(value)
          }
        />
      ),

      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) =>
            row.toggleSelected(value)
          }
          onClick={(e) => e.stopPropagation()}
        />
      ),
    };

    return [select, ...userColumns];
  }, [selectable, userColumns]);

  const table = useReactTable({
    data,
    columns,

    state: {
      sorting,
      globalFilter,
      rowSelection,
      columnVisibility: visibility,
    },

    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,

    getRowId,

    enableRowSelection: selectable,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),

    ...(pageSize > 0
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: {
            pagination: {
              pageSize,
              pageIndex: 0,
            },
          },
        }
      : {}),
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const selectedKey = Object.keys(rowSelection).join(",");

  React.useEffect(() => {
    onSelectionChange?.(selectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const rows = table.getRowModel().rows;

  const filteredCount =
    table.getFilteredRowModel().rows.length;

  const cellPad =
    density === "compact"
      ? "px-3 py-1.5"
      : "px-3 py-2.5";

  const hasToolbar =
    !!searchPlaceholder ||
    columnToggle ||
    (selectable && selectedRows.length > 0);

  return (
    <div className={cn("grid min-w-0 gap-3", className)}>
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <SearchInput
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={globalFilter}
              onValueChange={(value) => {
                setGlobalFilter(value);
                table.setPageIndex(0);
              }}
              className="w-full max-w-[260px]"
            />
          )}

          {selectable && selectedRows.length > 0 && (
            <div
              className="flex items-center gap-2"
              aria-live="polite"
            >
              <span className="text-[12.5px] text-muted-foreground tabular-nums">
                {selectedRows.length} selected
              </span>

              {bulkActions?.(selectedRows)}
            </div>
          )}

          {columnToggle && (
            <div className="relative ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setColumnMenuOpen((open) => !open)
                }
              >
                <Columns3 />
                Columns
              </Button>

              {columnMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-[10px] border border-border bg-popover p-1 shadow-lg">
                  <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                    Show columns
                  </p>

                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label
                        key={column.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-accent"
                      >
                        <Checkbox
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(value)
                          }
                        />

                        <span>
                          {column.columnDef.meta?.label ??
                            (typeof column.columnDef.header ===
                            "string"
                              ? column.columnDef.header
                              : column.id)}
                        </span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "min-w-0 overflow-x-auto rounded-[14px] bg-card ring-1 ring-border",
          SQUIRCLE,
        )}
      >
        <table
          aria-label={label}
          className="w-full border-collapse text-[13px]"
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;

                  const sorted =
                    header.column.getIsSorted();

                  const canSort =
                    header.column.getCanSort();

                  const align = meta?.align ?? "left";

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={
                        meta?.width
                          ? { width: meta.width }
                          : undefined
                      }
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : canSort
                              ? "none"
                              : undefined
                      }
                      className={cn(
                        "h-10 whitespace-nowrap px-3 text-[11.5px] font-medium text-muted-foreground",
                        align === "right"
                          ? "text-right"
                          : align === "center"
                            ? "text-center"
                            : "text-left",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : canSort
                          ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={cn(
                                  "-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-[6px] px-1.5 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  sorted &&
                                    "text-foreground",
                                  align === "right" &&
                                    "flex-row-reverse",
                                )}
                              >
                                {flexRender(
                                  header.column.columnDef
                                    .header,
                                  header.getContext(),
                                )}

                                {sorted === "asc" ? (
                                  <ArrowUp
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                ) : sorted === "desc" ? (
                                  <ArrowDown
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronsUpDown
                                    className="size-3.5 opacity-50"
                                    aria-hidden
                                  />
                                )}
                              </button>
                            )
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    table.getVisibleLeafColumns().length
                  }
                >
                  {empty ?? (
                    <EmptyState
                      title={
                        globalFilter
                          ? "No matches"
                          : "Nothing here yet"
                      }
                      description={
                        globalFilter
                          ? `Nothing matches “${globalFilter}”.`
                          : undefined
                      }
                      action={
                        globalFilter ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setGlobalFilter("")
                            }
                          >
                            Show everything
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={
                    row.getIsSelected()
                      ? "selected"
                      : undefined
                  }
                  onClick={
                    onRowClick
                      ? () => onRowClick(row.original)
                      : undefined
                  }
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/50 data-[state=selected]:bg-accent/70",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align =
                      cell.column.columnDef.meta?.align ??
                      "left";

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          cellPad,
                          "align-middle text-foreground",
                          align === "right"
                            ? "text-right tabular-nums"
                            : align === "center"
                              ? "text-center"
                              : "",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 &&
        table.getPageCount() > 1 && (
          <Pagination
            label={`${label} pages`}
            page={
              table.getState().pagination.pageIndex + 1
            }
            pageCount={table.getPageCount()}
            onPageChange={(page) =>
              table.setPageIndex(page - 1)
            }
            total={filteredCount}
            pageSize={
              table.getState().pagination.pageSize
            }
          />
        )}
    </div>
  );
}

export type { ColumnDef };

export default DataTable;
