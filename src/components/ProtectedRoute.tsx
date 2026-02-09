import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { logger } from "@/lib/logger";

interface ProtectedRouteProps {
    children: React.ReactNode;
    menuName?: string; // Optional: If specific menu access is required
    requiredRole?: string; // Optional: If specific role is required (e.g. 'super admin')
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, menuName, requiredRole }) => {
    const location = useLocation();

    // 1. Get User and Permissions
    const userStr = localStorage.getItem('user');
    const permissionsStr = localStorage.getItem('menuPermissions');

    if (!userStr) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const user = JSON.parse(userStr);
    const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];

    // 2. Check Role (if required)
    if (requiredRole && user.role !== requiredRole && user.role !== 'super admin') {
        logger.warn(`Access denied for ${user.username} (Role: ${user.role}) to path ${location.pathname}. Required: ${requiredRole}`);
        return <Navigate to="/" replace />; // Redirect to dashboard
    }

    // 3. Check Menu Permissions (if menuName provided)
    if (menuName) {
        // Super Admin access all
        if (user.role === 'super admin') {
            return <>{children}</>;
        }

        const userPermissions = permissions.find((p: any) => p.role === user.role);

        // If no permissions found for role, deny access (unless it's Dashboard which is usually allowed)
        if (!userPermissions) {
            // Exception for Dashboard if not explicitly listed? AdminPanel says "Dashboard" is a menu.
            if (menuName === 'Dashboard') return <>{children}</>;
            return <Navigate to="/" replace />;
        }

        if (!userPermissions.menus.includes(menuName)) {
            logger.warn(`Access denied for ${user.username} to menu '${menuName}'. Permissions: ${JSON.stringify(userPermissions.menus)}`);
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
