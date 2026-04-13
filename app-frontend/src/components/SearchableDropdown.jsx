import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableDropdown - Searchable dropdown supporting both static and async options
 * 
 * NEW API (Async):
 * @param {Function} fetchOptions - Async function (query) => Promise<[{value, label, ...}]>
 * @param {Function} onSelect - Callback when option is selected (option) => void
 * 
 * OLD API (Static - for backward compatibility):
 * @param {Array} options - Static array of options [{value, label}, ...]
 * @param {Function} onChange - Callback when option is selected (value) => void
 * 
 * Common:
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Currently selected value
 */
export default function SearchableDropdown({
  // New async API
  fetchOptions,
  onSelect,
  // Old static API
  options: staticOptions,
  onChange,
  // Common
  placeholder = "Search and select...",
  value,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Synchronize internal selectedOption with value prop
  useEffect(() => {
    if (value) {
      // Look in static options
      if (staticOptions) {
        const found = staticOptions.find(opt => opt.value === value || opt.id === value);
        if (found) {
          setSelectedOption(found);
          return;
        }
      }
      // Look in dynamic options
      if (options) {
        const found = options.find(opt => opt.value === value || opt.id === value);
        if (found) {
          setSelectedOption(found);
          return;
        }
      }
    } else {
      setSelectedOption(null);
    }
  }, [value, staticOptions, options]);

  // Determine if using async or static mode
  const isAsyncMode = !!fetchOptions;
  const isStaticMode = !!staticOptions;

  // Filter static options based on search query
  const getFilteredStaticOptions = () => {
    if (!isStaticMode) return [];
    if (!searchQuery) return staticOptions;

    const query = searchQuery.toLowerCase();
    return staticOptions.filter(opt =>
      opt.label?.toLowerCase().includes(query) ||
      opt.value?.toLowerCase().includes(query)
    );
  };

  // Update dropdown position when opened
  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom, // Fixed positioning is relative to viewport, not document
        left: rect.left,  // So we don't add window.scrollY/scrollX
        width: rect.width
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch options when search query changes (async mode only)
  useEffect(() => {
    if (!isAsyncMode) return; // Skip if using static options

    const searchAsync = async () => {
      setLoading(true);
      try {
        const results = await fetchOptions(searchQuery);
        setOptions(results || []);
      } catch (error) {
        console.error('Search error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      if (isOpen) {
        searchAsync();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchOptions, isOpen, isAsyncMode]);

  // Load initial options when dropdown opens (async mode only)
  useEffect(() => {
    if (!isAsyncMode) return; // Skip if using static options

    if (isOpen && options.length === 0 && !searchQuery) {
      const loadInitialOptions = async () => {
        setLoading(true);
        try {
          const results = await fetchOptions('');
          setOptions(results || []);
        } catch (error) {
          console.error('Load error:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      };
      loadInitialOptions();
    }
  }, [isOpen, searchQuery, isAsyncMode, fetchOptions]);

  const handleSelect = (option) => {
    setSelectedOption(option);

    // Support both new and old APIs
    if (onSelect) {
      onSelect(option); // New API
    }
    if (onChange) {
      onChange(option.value); // Old API
    }

    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedOption(null);
    setSearchQuery('');
  };

  const handleOpen = () => {
    updateDropdownPosition();
    setIsOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        <span className={selectedOption ? 'text-gray-900 text-sm' : 'text-gray-400 text-sm'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-2">
          {selectedOption && (
            <X
              size={16}
              className="text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown menu via Portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownMenuRef}
          className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {(() => {
              // Determine which options to display
              const displayOptions = isStaticMode ? getFilteredStaticOptions() : options;

              if (loading && isAsyncMode) {
                return (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-2 text-sm">Loading...</p>
                  </div>
                );
              }

              if (displayOptions.length === 0) {
                return (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <Search size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No options found</p>
                    <p className="text-xs text-gray-400 mt-1">Try searching with different keywords</p>
                  </div>
                );
              }

              return displayOptions.map((option, index) => (
                <button
                  key={option.value || option.id || index}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                  )}
                </button>
              ));
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
