import React from "react";
import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        "transition-colors duration-100",
        onClick && "cursor-pointer hover:bg-gray-50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  sortable?: boolean;
}

export function TableHeader({
  children,
  className,
  onClick,
  sortable,
}: TableHeaderProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
        sortable && "cursor-pointer hover:text-gray-700 select-none",
        className
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      className={cn("px-4 py-3 text-gray-700 align-middle", className)}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export function TableEmpty({
  colSpan,
  message = "No data found",
  icon,
}: {
  colSpan: number;
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          {icon && <div className="mb-3 opacity-50">{icon}</div>}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}
