-- Seed mock data for testing: supplies + materials

-- 1. Categories
INSERT INTO categories (id, name, description)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Office Supplies', 'Paper, pens, envelopes, and other consumables'),
  ('c0000001-0000-0000-0000-000000000002', 'IT Equipment', 'Computers, monitors, peripherals'),
  ('c0000001-0000-0000-0000-000000000003', 'Furniture', 'Desks, chairs, cabinets'),
  ('c0000001-0000-0000-0000-000000000004', 'Construction Materials', 'Cement, steel, lumber'),
  ('c0000001-0000-0000-0000-000000000005', 'Cleaning Supplies', 'Detergent, mops, gloves')
ON CONFLICT (id) DO NOTHING;

-- 2. Suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'National Office Depot', 'Juan dela Cruz', 'juan@nod.ph', '028000001'),
  ('d0000001-0000-0000-0000-000000000002', 'TechSource Inc.', 'Maria Santos', 'maria@techsource.ph', '028000002'),
  ('d0000001-0000-0000-0000-000000000003', 'BuildRight Corp.', 'Pedro Reyes', 'pedro@buildright.ph', '028000003'),
  ('d0000001-0000-0000-0000-000000000004', 'CleanPro Manila', 'Ana Gonzales', 'ana@cleanpro.ph', '028000004'),
  ('d0000001-0000-0000-0000-000000000005', 'FurniCraft Inc.', 'Carlos Lopez', 'carlos@furnicraft.ph', '028000005')
ON CONFLICT (id) DO NOTHING;

-- 3. Items — 5 supplies + 5 materials
INSERT INTO items (id, name, description, item_type, category_id, supplier_id, quantity, unit, reorder_level)
VALUES
  -- Supplies
  ('e0000001-0000-0000-0000-000000000001', 'Bond Paper A4 (70gsm)', 'Premium bond paper for official documents', 'supply', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 500, 'reams', 50),
  ('e0000001-0000-0000-0000-000000000002', 'Ballpoint Pen — Black', 'Standard issue black ink ballpoint pens', 'supply', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 240, 'pieces', 30),
  ('e0000001-0000-0000-0000-000000000003', 'Office Chair — Ergonomic', 'Adjustable ergonomic mesh-back chair', 'supply', 'c0000001-0000-0000-0000-000000000003', 'd0000005-0000-0000-0000-000000000005', 8, 'pieces', 2),
  ('e0000001-0000-0000-0000-000000000004', 'Desktop Monitor 24″', 'Full HD IPS LCD monitor', 'supply', 'c0000001-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 15, 'pieces', 5),
  ('e0000001-0000-0000-0000-000000000005', 'All-Purpose Detergent', 'Liquid detergent 1L', 'supply', 'c0000001-0000-0000-0000-000000000005', 'd0000004-0000-0000-0000-000000000004', 40, 'bottles', 10),

  -- Materials
  ('e0000002-0000-0000-0000-000000000001', 'Portland Cement (40kg)', 'Type 1 Portland cement bags', 'material', 'c0000001-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000003', 200, 'bags', 30),
  ('e0000002-0000-0000-0000-000000000002', 'Steel Rebar 12mm', 'Standard-grade steel reinforcement', 'material', 'c0000001-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000003', 500, 'lengths', 100),
  ('e0000002-0000-0000-0000-000000000003', 'Plywood ¾″ (4′×8′)', 'Marine-grade treated plywood', 'material', 'c0000001-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000003', 60, 'sheets', 10),
  ('e0000002-0000-0000-0000-000000000004', 'PVC Pipe 4″ x 10ft', 'Schedule 40 PVC pipe', 'material', 'c0000001-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000003', 120, 'pieces', 20),
  ('e0000002-0000-0000-0000-000000000005', 'Paint — Latex White (4L)', 'Interior latex white paint', 'material', 'c0000001-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000003', 25, 'gallons', 5);