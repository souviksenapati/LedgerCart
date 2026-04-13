import { useAuth } from '../context/AuthContext';

/**
 * PermissionGuard - Conditionally renders children based on user permissions.
 * 
 * Usage:
 *   <PermissionGuard permission="catalog:manage">
 *     <button>Edit Product</button>
 *   </PermissionGuard>
 * 
 *   <PermissionGuard permission="staff:view" fallback={<p>Access Denied</p>}>
 *     <StaffTable />
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, children, fallback = null }) {
    const { hasPermission } = useAuth();

    if (!permission || hasPermission(permission)) {
        return children;
    }

    return fallback;
}
