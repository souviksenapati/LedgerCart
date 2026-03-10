-- RBAC Migration Script for LedgerCart
-- Run this against your PostgreSQL database before deploying the new code.
-- NOTE: The DB stores enum values in UPPERCASE (ADMIN, STAFF, CUSTOMER, etc.)

-- 1. Add new role enum values (UPPERCASE to match existing DB convention)
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'STORE_MANAGER';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SALESPERSON';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PURCHASE_MANAGER';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'STOCK_KEEPER';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ACCOUNTANT';

-- 2. Add permissions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]';

-- 3. Set ADMIN permissions for existing admin users
UPDATE users SET permissions = '["*"]' WHERE role = 'ADMIN' AND (permissions IS NULL OR permissions = '[]');

-- 4. Set STAFF default permissions for existing staff
UPDATE users SET permissions = '["dashboard:view","stock:view"]' WHERE role = 'STAFF' AND (permissions IS NULL OR permissions = '[]');
