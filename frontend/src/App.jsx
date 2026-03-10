import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import StoreLayout from './layouts/StoreLayout';
import AdminLayout from './layouts/AdminLayout';
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';

// Store Pages
import HomePage from './pages/store/HomePage';
import ShopPage from './pages/store/ShopPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import OrderDetailPage from './pages/store/OrderDetailPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import PaymentPage from './pages/store/PaymentPage';
import OrderConfirmationPage from './pages/store/OrderConfirmationPage';
import OrdersPage from './pages/store/OrdersPage';
import CustomerLoginPage from './pages/store/CustomerLoginPage';
import RegisterPage from './pages/store/RegisterPage';
import AccountPage from './pages/store/AccountPage';
import WishlistPage from './pages/store/WishlistPage';

// Policy & Info Pages
import TermsPage from './pages/store/TermsPage';
import PrivacyPage from './pages/store/PrivacyPage';
import CancellationRefundPage from './pages/store/CancellationRefundPage';
import ShippingExchangePage from './pages/store/ShippingExchangePage';
import ContactPage from './pages/store/ContactPage';
import AboutPage from './pages/store/AboutPage';
import FAQPage from './pages/store/FAQPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminBannersPage from './pages/admin/AdminBannersPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminInwardsOutwardsPage from './pages/admin/AdminInwardsOutwardsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

// Inventory Management Pages
import AdminSuppliersPage from './pages/admin/AdminSuppliersPage';
import AdminB2BCustomersPage from './pages/admin/AdminB2BCustomersPage';
import AdminWarehousesPage from './pages/admin/AdminWarehousesPage';
import AdminPurchaseOrdersPage from './pages/admin/AdminPurchaseOrdersPage';
import AdminGRNPage from './pages/admin/AdminGRNPage';
import AdminPurchaseInvoicesPage from './pages/admin/AdminPurchaseInvoicesPage';
import AdminSalesQuotationsPage from './pages/admin/AdminSalesQuotationsPage';
import AdminSalesOrdersPage from './pages/admin/AdminSalesOrdersPage';
import AdminSalesInvoicesPage from './pages/admin/AdminSalesInvoicesPage';


/**
 * PermissionRoute — Page-level permission gate for admin routes.
 *
 * Checks if the current user has the required permission.
 * If not, redirects to /admin (dashboard) and shows an access denied toast.
 * This works in concert with AdminLayout's isStaff check (first line of defence).
 *
 * @param {string} permission - The permission key required to access this page.
 * @param {React.ReactNode} children - The page component to render if permitted.
 */
function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (permission && !hasPermission(permission)) {
      toast.error(`Access denied: '${permission}' permission required`);
      navigate('/admin', { replace: true });
    }
  }, [permission, hasPermission, navigate]);

  if (permission && !hasPermission(permission)) {
    // Render nothing while the effect fires the redirect
    return null;
  }

  return children;
}


export default function App() {
  return (
    <Routes>
      {/* Storefront Routes (with Navbar/Footer) */}
      <Route path="/" element={<StoreLayout><HomePage /></StoreLayout>} />
      <Route path="/shop" element={<StoreLayout><ShopPage /></StoreLayout>} />
      <Route path="/shop/:category" element={<StoreLayout><ShopPage /></StoreLayout>} />
      <Route path="/product/:slug" element={<StoreLayout><ProductDetailPage /></StoreLayout>} />
      <Route path="/cart" element={<StoreLayout><CartPage /></StoreLayout>} />
      <Route path="/checkout" element={<StoreLayout><CheckoutPage /></StoreLayout>} />
      <Route path="/payment/:id" element={<StoreLayout><PaymentPage /></StoreLayout>} />
      <Route path="/order-confirmation/:id" element={<StoreLayout><OrderConfirmationPage /></StoreLayout>} />
      <Route path="/orders" element={<StoreLayout><OrdersPage /></StoreLayout>} />
      <Route path="/orders/:id" element={<StoreLayout><OrderDetailPage /></StoreLayout>} />
      <Route path="/login" element={<StoreLayout><CustomerLoginPage /></StoreLayout>} />
      <Route path="/register" element={<StoreLayout><RegisterPage /></StoreLayout>} />
      <Route path="/account" element={<StoreLayout><AccountPage /></StoreLayout>} />
      <Route path="/wishlist" element={<StoreLayout><WishlistPage /></StoreLayout>} />

      {/* Policy & Info Routes */}
      <Route path="/terms" element={<StoreLayout><TermsPage /></StoreLayout>} />
      <Route path="/privacy" element={<StoreLayout><PrivacyPage /></StoreLayout>} />
      <Route path="/cancellation-refund" element={<StoreLayout><CancellationRefundPage /></StoreLayout>} />
      <Route path="/shipping-exchange" element={<StoreLayout><ShippingExchangePage /></StoreLayout>} />
      <Route path="/contact" element={<StoreLayout><ContactPage /></StoreLayout>} />
      <Route path="/about" element={<StoreLayout><AboutPage /></StoreLayout>} />
      <Route path="/faq" element={<StoreLayout><FAQPage /></StoreLayout>} />

      {/* Admin Portal Specific Login (No Store Layout) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Portal Routes (with Sidebar) — protected by AdminLayout first, then PermissionRoute per page */}
      <Route path="/admin" element={<AdminLayout />}>
        {/* Dashboard — accessible to all authenticated staff */}
        <Route index element={<PermissionRoute permission="dashboard:view"><DashboardPage /></PermissionRoute>} />

        {/* E-commerce */}
        <Route path="products" element={<PermissionRoute permission="catalog:view"><AdminProductsPage /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="catalog:view"><AdminCategoriesPage /></PermissionRoute>} />
        <Route path="orders" element={<PermissionRoute permission="ecom_orders:view"><AdminOrdersPage /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute permission="ecom_customers:view"><AdminCustomersPage /></PermissionRoute>} />

        {/* Staff & System */}
        <Route path="staff" element={<PermissionRoute permission="staff:view"><AdminStaffPage /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute permission="settings:view"><AdminSettingsPage /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute permission="reports:view"><AdminReportsPage /></PermissionRoute>} />

        {/* Marketing */}
        <Route path="coupons" element={<PermissionRoute permission="coupons:view"><AdminCouponsPage /></PermissionRoute>} />
        <Route path="banners" element={<PermissionRoute permission="banners:view"><AdminBannersPage /></PermissionRoute>} />
        <Route path="reviews" element={<PermissionRoute permission="reviews:view"><AdminReviewsPage /></PermissionRoute>} />

        {/* Inventory */}
        <Route path="inventory" element={<PermissionRoute permission="stock:view"><AdminInventoryPage /></PermissionRoute>} />
        <Route path="inventory-transactions" element={<PermissionRoute permission="stock:audit"><AdminInwardsOutwardsPage /></PermissionRoute>} />
        <Route path="warehouses" element={<PermissionRoute permission="warehouses:view"><AdminWarehousesPage /></PermissionRoute>} />

        {/* Purchase Module */}
        <Route path="suppliers" element={<PermissionRoute permission="suppliers:view"><AdminSuppliersPage /></PermissionRoute>} />
        <Route path="purchase-orders" element={<PermissionRoute permission="purchase_orders:view"><AdminPurchaseOrdersPage /></PermissionRoute>} />
        <Route path="grn" element={<PermissionRoute permission="grn:view"><AdminGRNPage /></PermissionRoute>} />
        <Route path="purchase-invoices" element={<PermissionRoute permission="purchase_invoices:view"><AdminPurchaseInvoicesPage /></PermissionRoute>} />

        {/* Sales Module */}
        <Route path="b2b-customers" element={<PermissionRoute permission="b2b_customers:view"><AdminB2BCustomersPage /></PermissionRoute>} />
        <Route path="sales-quotations" element={<PermissionRoute permission="sales_quotations:view"><AdminSalesQuotationsPage /></PermissionRoute>} />
        <Route path="sales-orders" element={<PermissionRoute permission="sales_orders:view"><AdminSalesOrdersPage /></PermissionRoute>} />
        <Route path="sales-invoices" element={<PermissionRoute permission="sales_invoices:view"><AdminSalesInvoicesPage /></PermissionRoute>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <StoreLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-200">404</h1>
              <p className="text-xl font-medium text-gray-600 mt-4">Page Not Found</p>
              <a href="/" className="btn-primary inline-block mt-6">Go Home</a>
            </div>
          </div>
        </StoreLayout>
      } />
    </Routes>
  );
}
