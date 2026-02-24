'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      )
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
      >
        <span className={selected ? 'text-slate-200' : 'text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-md shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
            />
          </div>
          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">No results</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors text-left"
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
