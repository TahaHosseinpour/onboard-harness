'use client';

import { FunctionIcon } from '@phosphor-icons/react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type CellFocusedEvent, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo, useRef, useState } from 'react';

import { sheetRows } from '@/lib/mock';
import { fa } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
type Col = (typeof COLS)[number];
type SheetRow = Record<Col, string | number>;

const header: SheetRow = { A: 'کالا', B: 'دسته', C: 'قیمت فعلی', D: 'قیمت پیشنهادی', E: 'فروش هفته', F: 'درآمد پیش‌بینی' };

const theme = themeQuartz.withParams({
  backgroundColor: 'var(--background)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  headerBackgroundColor: 'var(--surface)',
  headerTextColor: 'var(--muted-foreground)',
  rowHoverColor: 'var(--hover)',
  accentColor: 'var(--primary)',
  selectedRowBackgroundColor: 'var(--primary-soft)',
  fontFamily: 'inherit',
  fontSize: 13,
  headerFontSize: 12,
  rowHeight: 34,
  headerHeight: 30,
  wrapperBorderRadius: 0,
  wrapperBorder: false,
  columnBorder: true,
});

/** Tiny formula engine for the prototype: cell refs, + − × ÷ and SUM(range). */
function evaluate(raw: string | number, rows: SheetRow[], depth = 0): string | number {
  if (typeof raw !== 'string' || !raw.startsWith('=')) return raw;
  if (depth > 20) return '#REF';
  const cell = (col: string, row: string) => {
    const value = rows[Number(row) - 1]?.[col as Col];
    const result = value === undefined ? 0 : evaluate(value, rows, depth + 1);
    return typeof result === 'number' ? result : Number(result) || 0;
  };
  let expr = raw.slice(1).toUpperCase();
  expr = expr.replace(/SUM\(([A-F])(\d+):([A-F])(\d+)\)/g, (_m, c1: string, r1: string, c2: string, r2: string) => {
    let total = 0;
    for (let c = COLS.indexOf(c1 as Col); c <= COLS.indexOf(c2 as Col); c++) for (let r = Number(r1); r <= Number(r2); r++) total += cell(COLS[c], String(r));
    return String(total);
  });
  expr = expr.replace(/([A-F])(\d+)/g, (_m, c: string, r: string) => String(cell(c, r)));
  if (!/^[\d+\-*/().\s]+$/.test(expr)) return '#ERR';
  try {
    return Function(`"use strict"; return (${expr});`)() as number;
  } catch {
    return '#ERR';
  }
}

/** Excel-style sheet on AG Grid with a formula bar. Edit any number and the
 *  dependent formulas recalculate in place. */
export function SheetEditor() {
  const [rows, setRows] = useState<SheetRow[]>(() => [header, ...(sheetRows as SheetRow[])]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [focus, setFocus] = useState<{ col: Col; row: number }>({ col: 'F', row: 1 });

  const columnDefs = useMemo<ColDef<SheetRow>[]>(
    () => [
      {
        headerName: '',
        width: 46,
        editable: false,
        sortable: false,
        resizable: false,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        cellClass: 'text-muted-foreground text-xs !bg-[var(--surface)] text-center',
      },
      ...COLS.map<ColDef<SheetRow>>((col) => ({
        field: col,
        headerName: col,
        headerClass: 'ag-header-cell-center',
        flex: col === 'A' ? 1.6 : 1,
        minWidth: 110,
        editable: true,
        sortable: false,
        valueFormatter: (p) => {
          const value = evaluate(p.value as string | number, rowsRef.current);
          return typeof value === 'number' ? fa(value) : String(value ?? '');
        },
        valueParser: (p) => {
          const text = String(p.newValue ?? '').trim();
          return text !== '' && !text.startsWith('=') && !Number.isNaN(Number(text)) ? Number(text) : text;
        },
        cellClassRules: {
          'font-semibold': (p) => p.node?.rowIndex === 0 || p.node?.rowIndex === rowsRef.current.length - 1,
          'text-primary': (p) => typeof p.value === 'string' && p.value.startsWith('='),
        },
      })),
    ],
    [],
  );

  const raw = rows[focus.row]?.[focus.col] ?? '';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className="bg-secondary ltr-nums flex h-6 w-12 items-center justify-center rounded-full text-xs font-medium">
          {focus.col}
          {focus.row + 1}
        </span>
        <FunctionIcon className="text-muted-foreground size-4" />
        <input
          dir="ltr"
          value={String(raw)}
          onChange={(e) => {
            const text = e.target.value;
            setRows((prev) => prev.map((row, index) => (index === focus.row ? { ...row, [focus.col]: text !== '' && !text.startsWith('=') && !Number.isNaN(Number(text)) ? Number(text) : text } : row)));
          }}
          className="h-7 flex-1 bg-transparent text-end font-mono text-sm outline-none"
          aria-label="نوار فرمول"
        />
      </div>
      <div className="min-h-0 flex-1">
        <AgGridReact<SheetRow>
          theme={theme}
          enableRtl
          rowData={rows}
          columnDefs={columnDefs}
          suppressMovableColumns
          stopEditingWhenCellsLoseFocus
          onCellFocused={(e: CellFocusedEvent<SheetRow>) => {
            const col = typeof e.column === 'object' && e.column ? e.column.getColId() : '';
            if (e.rowIndex != null && (COLS as readonly string[]).includes(col)) setFocus({ col: col as Col, row: e.rowIndex });
          }}
          onCellValueChanged={(e) => {
            // Copy so React state stays the source of truth, then repaint dependants.
            setRows((prev) => prev.map((row, index) => (index === e.rowIndex ? { ...e.data } : row)));
            e.api.refreshCells({ force: true });
          }}
        />
      </div>
      <div className="text-muted-foreground flex h-8 shrink-0 items-center gap-4 border-t px-3 text-xs">
        <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 font-medium">قیمت‌ها</span>
        <span>موجودی</span>
        <span>رقبا</span>
        <span className="ms-auto">فرمول‌ها زنده‌اند: عددی را عوض کنید تا جمع‌ها به‌روز شود.</span>
      </div>
    </div>
  );
}
