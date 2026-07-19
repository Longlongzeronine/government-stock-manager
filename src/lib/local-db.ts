/**
 * Local PostgreSQL client wrapper.
 * Uses the postgres.js library (porsager/postgres).
 * Only runs on the server side (increateServerFn or server-only contexts).
 */

// @ts-ignore - postgres is ESM, but this works in TanStack Start server functions
import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

function getDbUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.VITE_DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/government_stock_manager"
  );
}

export function getSql() {
  if (!sql) {
    sql = postgres(getDbUrl(), {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 10,
    }) as any;
  }
  return sql as any;
}

// ============================================
// QUERY HELPERS
// ============================================

export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  const s = getSql();
  return s(strings, ...values);
}

export async function queryRaw<T = any>(
  sqlStr: string,
  ...params: any[]
): Promise<T[]> {
  const s = getSql();
  return s.unsafe(sqlStr, params);
}

// ============================================
// SEED / MIGRATE
// ============================================

export async function ensureSchema() {
  const s = getSql();
  // Run the migration SQL
  const migration = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      contact TEXT DEFAULT NULL,
      address TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Item type enum
    DO $$ BEGIN
      CREATE TYPE item_type_enum AS ENUM ('supply', 'material');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE inventory_classification_enum AS ENUM ('expendable_supply', 'semi_expendable_property', 'ppe');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE semi_expendable_tier_enum AS ENUM ('low_value', 'high_value');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE accountability_status_enum AS ENUM ('available','issued','returned','lost','damaged','disposed','transferred');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE tx_type_enum AS ENUM ('IN', 'OUT');
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

    -- Give both existing and future inventory records stable scan values.
    UPDATE items
    SET barcode_value = id::text
    WHERE barcode_value IS NULL OR btrim(barcode_value) = '';

    UPDATE items
    SET qr_code_value = 'ITEM:' || id::text
    WHERE qr_code_value IS NULL OR btrim(qr_code_value) = '';

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
          NEW.semi_expendable_tier := CASE WHEN NEW.acquisition_cost >= 15000 THEN 'high_value' ELSE 'low_value' END;
        END IF;
      END IF;
      IF NEW.barcode_value IS NULL OR btrim(NEW.barcode_value) = '' THEN
        NEW.barcode_value := NEW.id::text;
      END IF;
      IF NEW.qr_code_value IS NULL OR btrim(NEW.qr_code_value) = '' THEN
        NEW.qr_code_value := 'ITEM:' || NEW.id::text;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_auto_classify_item ON items;
    CREATE TRIGGER trg_auto_classify_item
      BEFORE INSERT OR UPDATE OF item_type, acquisition_cost ON items
      FOR EACH ROW EXECUTE FUNCTION auto_classify_item();

    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_items_updated_at ON items;
    CREATE TRIGGER trg_items_updated_at
      BEFORE UPDATE ON items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON items(supplier_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_barcode_value_unique ON items(barcode_value);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_qr_code_value_unique ON items(qr_code_value);
    CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `;

  await s.unsafe(migration);
  return true;
}
