import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, UserCog,
  Ticket, Image, Star, Warehouse, Settings, BarChart3, LogOut, Store,
  ArrowLeftRight, Building, UserCircle, MapPin, ShoppingBag, PackageCheck,
  FileText, Receipt, FileSignature, ClipboardList, Info, ChevronDown
} from 'lucide-react';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview of business performance and key metrics', end: true, requiredPermission: 'dashboard:view' },
  { to: '/admin/products', icon: Package, label: 'Products', description: 'Manage your product catalog, prices, and variants', requiredPermission: 'catalog:view' },
  { to: '/admin/categories', icon: FolderTree, label: 'Categories', description: 'Organize products for easier storefront navigation', requiredPermission: 'catalog:view' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'E-commerce Orders', description: 'Manage online retail orders received from customers', requiredPermission: 'ecom_orders:view' },
  { to: '/admin/customers', icon: Users, label: 'E-commerce Customers', description: 'Manage registered retail customer profiles and history', requiredPermission: 'ecom_customers:view' },

  { divider: true, label: 'BUSINESS OPERATIONS' },
  {
    dropdown: true,
    icon: FileText,
    label: 'Sales Module',
    description: 'Manage the complete sales lifecycle from lead to invoice',
    items: [
      { to: '/admin/sales-quotations', icon: FileSignature, label: 'Sales Quotations', description: 'Create and track price estimates for B2B prospects', requiredPermission: 'sales_quotations:view' },
      { to: '/admin/sales-orders', icon: ClipboardList, label: 'Sales Orders', description: 'Manage confirmed B2B orders and stock commitments', requiredPermission: 'sales_orders:view' },
      { to: '/admin/sales-invoices', icon: Receipt, label: 'Sales Invoices', description: 'Generate GST-compliant tax invoices and track receivables', requiredPermission: 'sales_invoices:view' },
      { to: '/admin/b2b-customers', icon: UserCircle, label: 'B2B Customers', description: 'Manage wholesale clients and their credit profiles', requiredPermission: 'b2b_customers:view' },
    ]
  },
  {
    dropdown: true,
    icon: ShoppingBag,
    label: 'Purchase Module',
    description: 'Manage procurement processes and supplier relationships',
    items: [
      { to: '/admin/purchase-orders', icon: ClipboardList, label: 'Purchase Orders', description: 'Issue official orders to suppliers for stock replenishment', requiredPermission: 'purchase_orders:view' },
      { to: '/admin/grn', icon: PackageCheck, label: 'Goods Receipt (GRN)', description: 'Record physical delivery of goods and update batch stock', requiredPermission: 'grn:view' },
      { to: '/admin/purchase-invoices', icon: Receipt, label: 'Purchase Invoices', description: 'Process supplier bills and reconcile with GRN', requiredPermission: 'purchase_invoices:view' },
      { to: '/admin/suppliers', icon: Building, label: 'Suppliers', description: 'Maintain directory of active vendors and sourcing contacts', requiredPermission: 'suppliers:view' },
    ]
  },
  {
    dropdown: true,
    icon: Warehouse,
    label: 'Inventory Management',
    description: 'Monitor stock movement, health and location logistics',
    items: [
      { to: '/admin/inventory', icon: Package, label: 'Stock Levels', description: 'Real-time overview of current inventory availability', requiredPermission: 'stock:view' },
      { to: '/admin/warehouses', icon: MapPin, label: 'Warehouses', description: 'Manage multiple storage locations and distributions', requiredPermission: 'warehouses:view' },
      { to: '/admin/inventory-transactions', icon: ArrowLeftRight, label: 'Inwards/Outwards', description: 'Log of all stock movements for audit trails', requiredPermission: 'stock:audit' },
    ]
  },

  { divider: true, label: 'MARKETING & SYSTEM' },
  { to: '/admin/staff', icon: UserCog, label: 'Staff Management', description: 'Control administrative access and team roles', requiredPermission: 'staff:view' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupons', description: 'Dynamic discount management for promotions', requiredPermission: 'coupons:view' },
  { to: '/admin/banners', icon: Image, label: 'Store Banners', description: 'Design homepage sliders and promotional areas', requiredPermission: 'banners:view' },
  { to: '/admin/reviews', icon: Star, label: 'Customer Reviews', description: 'Monitor and moderate public product feedback', requiredPermission: 'reviews:view' },

  { divider: true, label: 'CONFIGURATION' },
  { to: '/admin/settings', icon: Settings, label: 'System Settings', description: 'Global application configuration and defaults', requiredPermission: 'settings:view' },
];

export default function AdminLayout() {
  const { user, isStaff, hasPermission, logout } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [expandedDropdown, setExpandedDropdown] = useState(null);
  const iconRefs = useRef({});

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  if (!user || !isStaff) return <Navigate to="/admin/login" replace />;

  // Calculate sidebar items to avoid empty dividers
  const sidebarItems = [];
  let currentDivider = null;

  links.forEach(link => {
    if (link.divider) {
      currentDivider = link;
    } else {
      let isVisible = false;
      if (link.dropdown) {
        // Dropdown is visible if any of its children are visible
        isVisible = link.items.some(item => !item.requiredPermission || hasPermission(item.requiredPermission));
      } else {
        // Regular link visibility
        isVisible = !link.requiredPermission || hasPermission(link.requiredPermission);
      }

      if (isVisible) {
        if (currentDivider) {
          sidebarItems.push(currentDivider);
          currentDivider = null; // Mark as added
        }
        sidebarItems.push(link);
      }
    }
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0 shadow-2xl relative overflow-visible">
        <div className="p-5 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            {settings.store_logo_url
              ? <img src={settings.store_logo_url} alt={settings.store_name || 'LedgerCart'} className="h-8 w-auto brightness-0 invert" />
              : <img src="/logo.svg" alt={settings.store_name || 'LedgerCart'} className="h-8 w-auto brightness-0 invert" />
            }
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-visible">
          {sidebarItems.map((link, index) => {
            if (link.divider) {
              return (
                <div key={`divider-${index}`} className="px-4 py-3 mt-4 mb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{link.label}</p>
                </div>
              );
            }

            // At this point we know the link is visible and not a divider
            // Handle dropdown menu
            if (link.dropdown) {
              // Filter dropdown items by permission
              const visibleItems = link.items.filter(item =>
                !item.requiredPermission || hasPermission(item.requiredPermission)
              );
              // Hide entire dropdown if no child items are visible
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedDropdown === link.label;
              const isAnyChildActive = visibleItems.some(item => location.pathname === item.to);

              return (
                <div key={`dropdown-${index}`}>
                  <button
                    onClick={() => setExpandedDropdown(isExpanded ? null : link.label)}
                    onMouseEnter={() => setHoveredNavItem(link.label)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all ${isAnyChildActive ? 'bg-primary text-white border-l-4 border-primary-400 font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="w-5 h-5 shrink-0" />
                      <span className="text-left leading-tight">{link.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="relative"
                        ref={(el) => iconRefs.current[link.label] = el}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ top: rect.top, left: rect.right });
                          setHoveredLink(link.label);
                        }}
                        onMouseLeave={() => setHoveredLink(null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className={`w-4 h-4 transition-all duration-200 ${hoveredLink === link.label ? 'text-primary-400' : 'text-white/60'
                          } ${hoveredNavItem === link.label ? 'opacity-100' : 'opacity-0'
                          }`} />

                        {hoveredLink === link.label && link.description && createPortal(
                          <div
                            className="fixed z-[9999] w-72"
                            style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                          >
                            <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                              <div className="font-semibold mb-1 text-primary-400">{link.label}</div>
                              <div className="text-gray-200 leading-relaxed">{link.description}</div>
                              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown items */}
                  {isExpanded && (
                    <div className="bg-gray-800/50">
                      {visibleItems.map((item, itemIndex) => (
                        <div
                          key={item.to}
                          onMouseEnter={() => setHoveredNavItem(item.to)}
                          onMouseLeave={() => setHoveredNavItem(null)}
                        >
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center justify-between gap-3 pl-12 pr-4 py-2.5 text-sm transition-all ${isActive ? 'bg-primary-500/20 text-primary-300 border-l-4 border-primary-400 font-medium' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white border-l-4 border-transparent'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="text-left leading-snug">{item.label}</span>
                            </div>
                            <div
                              className="relative"
                              ref={(el) => iconRefs.current[item.to] = el}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({ top: rect.top, left: rect.right });
                                setHoveredLink(item.to);
                              }}
                              onMouseLeave={() => setHoveredLink(null)}
                            >
                              <Info className={`w-3.5 h-3.5 transition-all duration-200 ${hoveredLink === item.to ? 'text-orange-400' : 'text-white/60'
                                } ${hoveredNavItem === item.to ? 'opacity-100' : 'opacity-0'
                                }`} />

                              {hoveredLink === item.to && item.description && createPortal(
                                <div
                                  className="fixed z-[9999] w-72"
                                  style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                                >
                                  <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                                    <div className="font-semibold mb-1 text-primary-400">{item.label}</div>
                                    <div className="text-gray-200 leading-relaxed">{item.description}</div>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                          </NavLink>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Handle regular links
            return (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={() => setHoveredNavItem(link.to)}
                onMouseLeave={() => setHoveredNavItem(null)}
              >
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all relative ${isActive ? 'bg-primary text-white border-l-4 border-primary-400 font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 shrink-0" />
                    <span className="text-left leading-tight">{link.label}</span>
                  </div>
                  <div
                    className="relative"
                    ref={(el) => iconRefs.current[link.to] = el}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ top: rect.top, left: rect.right });
                      setHoveredLink(link.to);
                    }}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    <Info className={`w-4 h-4 transition-all duration-200 ${hoveredLink === link.to ? 'text-primary-400' : 'text-white/60'
                      } ${hoveredNavItem === link.to ? 'opacity-100' : 'opacity-0'
                      }`} />

                    {/* Tooltip - Rendered via Portal */}
                    {hoveredLink === link.to && link.description && createPortal(
                      <div
                        className="fixed z-[9999] w-72"
                        style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                      >
                        <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                          <div className="font-semibold mb-1 text-primary-400">{link.label}</div>
                          <div className="text-gray-200 leading-relaxed">{link.description}</div>
                          {/* Arrow */}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </NavLink>
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="text-xs text-gray-400 mb-2 truncate">{user.first_name} {user.last_name}</div>
          <div className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded inline-block mb-2">{user.role}</div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
