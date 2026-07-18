-- ============================================
-- LOCAL POSTGRESQL PRIMARY DATABASE SCHEMA
-- Run this against your local government_stock_manager DB
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ITEMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE item_type_enum AS ENUM ('supply', 'material');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_classification_enum AS ENUM (
    'expendable_supply',
    'semi_expendable_property',
    'ppe'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE semi_expendable_tier_enum AS ENUM ('low_value', 'high_value');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE accountability_status_enum AS ENUM (
    'available', 'issued', 'returned', 'lost', 'damaged', 'disposed', 'transferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  item_type item_type_enum NOT NULL DEFAULT 'supply',
  inventory_classification inventory_classification_enum NOT NULL DEFAULT 'expendable_supply',
  semi_expendable_tier semi_expendable_tier_enum DEFAULT NULL,
  accountability_status accountability_status_enum NOT NULL DEFAULT 'available',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10,
  acquisition_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  barcode_value TEXT DEFAULT NULL,
  qr_code_value TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classification trigger: auto-set inventory_classification based on item_type and cost
CREATE OR REPLACE FUNCTION auto_classify_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'supply' THEN
    NEW.inventory_classification := 'expendable_supply';
    NEW.semi_expendable_tier := NULL;
  ELSIF NEW.item_type = 'material' THEN
    IF NEW.acquisition_cost >= 50000 THEN
      NEW.inventory_classification := 'ppe';
      NEW.semi_expendable_tier := NULL;
    ELSE
      NEW.inventory_classification := 'semi_expendable_property';
      NEW.semi_expendable_tier := CASE
        WHEN NEW.acquisition_cost >= 15000 THEN 'high_value'
        ELSE 'low_value'
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_classify_item ON items;
CREATE TRIGGER trg_auto_classify_item
  BEFORE INSERT OR UPDATE OF item_type, acquisition_cost ON items
  FOR EACH ROW
  EXECUTE FUNCTION auto_classify_item();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_updated_at ON items;
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRANSACTIONS
-- ============================================
DO $$ BEGIN
  CREATE TYPE tx_type_enum AS ENUM ('IN', 'OUT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type tx_type_enum NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  staff_id TEXT DEFAULT NULL,
  staff_name TEXT DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  source_form_type TEXT DEFAULT NULL,
  source_form_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT DEFAULT NULL,
  actor_email TEXT DEFAULT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT DEFAULT NULL,
  payload JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- FORMS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS iar_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iar_no TEXT NOT NULL UNIQUE,
  supplier TEXT DEFAULT NULL,
  invoice_no TEXT DEFAULT NULL,
  accepted_by TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_by_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS iar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iar_id UUID NOT NULL REFERENCES iar_forms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  remarks TEXT DEFAULT NULL,
  transaction_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ris_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ris_no TEXT NOT NULL UNIQUE,
  office TEXT DEFAULT NULL,
  purpose TEXT DEFAULT NULL,
  requested_by TEXT DEFAULT NULL,
  approved_by TEXT DEFAULT NULL,
  issued_by TEXT DEFAULT NULL,
  received_by TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_by_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ris_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ris_id UUID NOT NULL REFERENCES ris_forms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(12,2) NOT NULL,
  remarks TEXT DEFAULT NULL,
  transaction_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ics_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ics_no TEXT NOT NULL UNIQUE,
  ris_id UUID DEFAULT NULL,
  custodian_name TEXT DEFAULT NULL,
  office TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_by_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ics_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ics_id UUID NOT NULL REFERENCES ics_forms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS par_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  par_no TEXT NOT NULL UNIQUE,
  ris_id UUID DEFAULT NULL,
  accountable_person TEXT DEFAULT NULL,
  office TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_by_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS par_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  par_id UUID NOT NULL REFERENCES par_forms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_iar_items_iar_id ON iar_items(iar_id);
CREATE INDEX IF NOT EXISTS idx_ris_items_ris_id ON ris_items(ris_id);
CREATE INDEX IF NOT EXISTS idx_ics_items_ics_id ON ics_items(ics_id);
CREATE INDEX IF NOT EXISTS idx_par_items_par_id ON par_items(par_id);
