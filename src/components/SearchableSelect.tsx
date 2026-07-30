"use client";

/**
 * Searchable multi-select dropdown for string-keyed filter options.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { FilterOption } from "@/lib/types";

interface SearchableSelectProps {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Filters options by case-insensitive substring match (Turkish locale).
 */
function filterOptions(options: FilterOption[], query: string): FilterOption[] {
  const normalized = query.trim().toLocaleLowerCase("tr");
  if (!normalized) return options;
  return options.filter((option) =>
    option.name.toLocaleLowerCase("tr").includes(normalized),
  );
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Ara ve seç…",
  disabled = false,
}: SearchableSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.id)),
    [options, value],
  );

  const filtered = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggleOption(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  }

  function removeOption(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    onChange(value.filter((item) => item !== id));
  }

  function clearAll(event: React.MouseEvent) {
    event.stopPropagation();
    onChange([]);
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <div ref={containerRef} className={`relative ${open ? "z-50" : ""}`}>
        <div
          className={`rounded-lg border bg-white ${
            disabled
              ? "cursor-not-allowed border-slate-100 bg-slate-50"
              : open
                ? "border-violet-500 ring-2 ring-violet-500"
                : "border-slate-200"
          }`}
          onClick={() => {
            if (!disabled) inputRef.current?.focus();
          }}
        >
          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-2 pt-2">
              {selectedOptions.map((option) => (
                <span
                  key={option.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800"
                >
                  <span className="truncate">{option.name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(event) => removeOption(option.id, event)}
                      className="rounded p-0.5 text-violet-600 hover:bg-violet-100"
                      aria-label={`${option.name} seçimini kaldır`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              disabled={disabled}
              value={query}
              placeholder={
                selectedOptions.length > 0 ? "Daha fazla ara…" : placeholder
              }
              onFocus={() => {
                if (!disabled) setOpen(true);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:text-slate-400"
            />
            {value.length > 0 && !disabled && (
              <button
                type="button"
                onClick={clearAll}
                className="mr-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={`${label} seçimlerini temizle`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown
              className={`mr-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {open && !disabled && (
          <ul
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">Sonuç bulunamadı</li>
            ) : (
              filtered.map((option) => {
                const selected = value.includes(option.id);
                return (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => toggleOption(option.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        selected ? "bg-violet-50 text-violet-800" : "text-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="truncate">{option.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
