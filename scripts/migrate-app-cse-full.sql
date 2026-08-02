-- APP-CSE 2026 Migration
-- Generated: 2026-08-01T22:08:51.328Z
-- Items: 318 (Part I: 230, Part II: 88)
-- Derived/computed columns from the workbook (Q1-Q4 totals, quarterly amounts, Total Amount
-- col26) are intentionally NOT stored — they are recalculable from unit price x monthly quantities
-- and the schema has no column for them. Excel's Total Quantity (col24) was cross-checked against
-- the monthly sum (mismatches logged).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- The classify_inventory_item trigger auto-assigns barcode_value when NULL, which would
-- break the app's Part II (barcode_value IS NULL) display. Disable it during import.
ALTER TABLE items DISABLE TRIGGER classify_inventory_item_before_write;

INSERT INTO categories (name) SELECT 'ALCOHOL OR ACETONE BASED ANTISEPTICS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'ALCOHOL OR ACETONE BASED ANTISEPTICS');
INSERT INTO categories (name) SELECT 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES');
INSERT INTO categories (name) SELECT 'AUDIO AND VISUAL EQUIPMENT AND SUPPLIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'AUDIO AND VISUAL EQUIPMENT AND SUPPLIES');
INSERT INTO categories (name) SELECT 'BATTERIES AND CELLS AND ACCESSORIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'BATTERIES AND CELLS AND ACCESSORIES');
INSERT INTO categories (name) SELECT 'CLEANING EQUIPMENT AND SUPPLIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES');
INSERT INTO categories (name) SELECT 'COLOR COMPOUNDS AND DISPERSIONS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'COLOR COMPOUNDS AND DISPERSIONS');
INSERT INTO categories (name) SELECT 'CONSUMER ELECTRONICS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'CONSUMER ELECTRONICS');
INSERT INTO categories (name) SELECT 'FILMS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'FILMS');
INSERT INTO categories (name) SELECT 'FIRE FIGHTING EQUIPMENT' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'FIRE FIGHTING EQUIPMENT');
INSERT INTO categories (name) SELECT 'FLAG OR ACCESSORIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'FLAG OR ACCESSORIES');
INSERT INTO categories (name) SELECT 'FURNITURE AND FURNISHINGS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'FURNITURE AND FURNISHINGS');
INSERT INTO categories (name) SELECT 'HEATING AND VENTILATION AND AIR CIRCULATION' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'HEATING AND VENTILATION AND AIR CIRCULATION');
INSERT INTO categories (name) SELECT 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES');
INSERT INTO categories (name) SELECT 'LIGHTING AND FIXTURES AND ACCESSORIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'LIGHTING AND FIXTURES AND ACCESSORIES');
INSERT INTO categories (name) SELECT 'MANUFACTURING COMPONENTS AND SUPPLIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES');
INSERT INTO categories (name) SELECT 'MEASURING AND OBSERVING AND TESTING EQUIPMENT' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'MEASURING AND OBSERVING AND TESTING EQUIPMENT');
INSERT INTO categories (name) SELECT 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES');
INSERT INTO categories (name) SELECT 'PAPER MATERIALS AND PRODUCTS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS');
INSERT INTO categories (name) SELECT 'PERFUMES OR COLOGNES OR FRAGRANCES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PERFUMES OR COLOGNES OR FRAGRANCES');
INSERT INTO categories (name) SELECT 'PESTICIDES OR PEST REPELLENTS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PESTICIDES OR PEST REPELLENTS');
INSERT INTO categories (name) SELECT 'PRINTED PUBLICATIONS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PRINTED PUBLICATIONS');
INSERT INTO categories (name) SELECT 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)');
INSERT INTO categories (name) SELECT 'SOFTWARE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'SOFTWARE');
INSERT INTO categories (name) SELECT 'AIRLINE TICKETS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'AIRLINE TICKETS');
INSERT INTO categories (name) SELECT 'MOTOR VEHICLE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'MOTOR VEHICLE');
INSERT INTO categories (name) SELECT 'CLOUD COMPUTING SERVICES' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'CLOUD COMPUTING SERVICES');
INSERT INTO categories (name) SELECT 'PART II - OTHER ITEMS' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PART II - OTHER ITEMS');

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ALCOHOL, Ethyl, 500 mL', NULL, (SELECT id FROM categories WHERE name = 'ALCOHOL OR ACETONE BASED ANTISEPTICS'), 'supply', 44, 'bottle', 10, 55.62, '12191601-AL-E04', 'expendable_supply', NULL, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 4, 4
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ALCOHOL, Ethyl, 500 mL' AND barcode_value = '12191601-AL-E04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ALCOHOL, Ethyl,  1 Gallon', NULL, (SELECT id FROM categories WHERE name = 'ALCOHOL OR ACETONE BASED ANTISEPTICS'), 'supply', 0, 'gallon', 10, 362.45, '12191601-AL-E03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ALCOHOL, Ethyl,  1 Gallon' AND barcode_value = '12191601-AL-E03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLEARBOOK, A4 size', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 35.52, '60121413-CB-P01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLEARBOOK, A4 size' AND barcode_value = '60121413-CB-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLEARBOOK, Legal size', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 8, 'piece', 10, 38.23, '60121413-CB-P02', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLEARBOOK, Legal size' AND barcode_value = '60121413-CB-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ERASER, plastic/rubber', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 9.34, '60121534-ER-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ERASER, plastic/rubber' AND barcode_value = '60121534-ER-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Extra Fine Tip, Black', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 27.11, '60121524-SP-G01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Extra Fine Tip, Black' AND barcode_value = '60121524-SP-G01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Extra Fine Tip, Blue', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 15, 'piece', 10, 27.11, '60121524-SP-G02', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Extra Fine Tip, Blue' AND barcode_value = '60121524-SP-G02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Extra Fine Tip, Red', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 27.11, '60121524-SP-G03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Extra Fine Tip, Red' AND barcode_value = '60121524-SP-G03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Fine Tip, Black', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 30.91, '60121524-SP-G04', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Fine Tip, Black' AND barcode_value = '60121524-SP-G04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Fine Tip, Blue', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 30.91, '60121524-SP-G05', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Fine Tip, Blue' AND barcode_value = '60121524-SP-G05')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Fine Tip, Red', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 30.91, '60121524-SP-G06', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Fine Tip, Red' AND barcode_value = '60121524-SP-G06')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Medium Tip, Black', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 48, 'piece', 10, 63.62, '60121524-SP-G07', 'expendable_supply', NULL, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Medium Tip, Black' AND barcode_value = '60121524-SP-G07')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Medium Tip, Blue', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 48, 'piece', 10, 63.62, '60121524-SP-G08', 'expendable_supply', NULL, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Medium Tip, Blue' AND barcode_value = '60121524-SP-G08')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SIGN PEN, Medium Tip, Red', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 8, 'piece', 10, 63.62, '60121524-SP-G09', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SIGN PEN, Medium Tip, Red' AND barcode_value = '60121524-SP-G09')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WRAPPING PAPER', NULL, (SELECT id FROM categories WHERE name = 'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 3, 'pack', 10, 163.62, '60121124-WR-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WRAPPING PAPER' AND barcode_value = '60121124-WR-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOCUMENT CAMERA', NULL, (SELECT id FROM categories WHERE name = 'AUDIO AND VISUAL EQUIPMENT AND SUPPLIES'), 'supply', 0, 'unit', 10, 23977.95, '45121517-DO-C02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOCUMENT CAMERA' AND barcode_value = '45121517-DO-C02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MULTIMEDIA PROJECTOR', NULL, (SELECT id FROM categories WHERE name = 'AUDIO AND VISUAL EQUIPMENT AND SUPPLIES'), 'supply', 0, 'unit', 10, 16836.82, '45111609-MM-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MULTIMEDIA PROJECTOR' AND barcode_value = '45111609-MM-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BATTERY, dry cell, size AA', NULL, (SELECT id FROM categories WHERE name = 'BATTERIES AND CELLS AND ACCESSORIES'), 'supply', 40, 'pack', 10, 20.8, '26111702-BT-A02', 'expendable_supply', NULL, 0, 10, 0, 0, 10, 0, 0, 10, 0, 0, 10, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BATTERY, dry cell, size AA' AND barcode_value = '26111702-BT-A02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BATTERY, dry cell, size AAA', NULL, (SELECT id FROM categories WHERE name = 'BATTERIES AND CELLS AND ACCESSORIES'), 'supply', 17, 'pack', 10, 18.61, '26111702-BT-A01', 'expendable_supply', NULL, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0, 2, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BATTERY, dry cell, size AAA' AND barcode_value = '26111702-BT-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR FRESHENER', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 12, 'can', 10, 126.67, '47131812-AF-A01', 'expendable_supply', NULL, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0, 0, 3
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR FRESHENER' AND barcode_value = '47131812-AF-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BROOM (Walis Tambo)', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 80, 'piece', 10, 126.67, '47131604-BR-S01', 'expendable_supply', NULL, 20, 0, 0, 20, 0, 0, 20, 0, 0, 20, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BROOM (Walis Tambo)' AND barcode_value = '47131604-BR-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BROOM (Walis Ting-ting)', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'piece', 10, 26.39, '47131604-BR-T01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BROOM (Walis Ting-ting)' AND barcode_value = '47131604-BR-T01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLEANER, Toilet Bowl and Urinal', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'bottle', 10, 42.22, '47131829-TB-C01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLEANER, Toilet Bowl and Urinal' AND barcode_value = '47131829-TB-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLEANSER, Scouring Powder', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 8, 'can', 10, 42.22, '47131805-CL-P01', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLEANSER, Scouring Powder' AND barcode_value = '47131805-CL-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DETERGENT BAR', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'piece', 10, 9.48, '47131811-DE-B02', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DETERGENT BAR' AND barcode_value = '47131811-DE-B02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DETERGENT POWDER, all purpose', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'pouch', 10, 54.89, '47131811-DE-P03', 'expendable_supply', NULL, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DETERGENT POWDER, all purpose' AND barcode_value = '47131811-DE-P03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DISINFECTANT SPRAY', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'can', 10, 141.98, '47131803-DS-A01', 'expendable_supply', NULL, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DISINFECTANT SPRAY' AND barcode_value = '47131803-DS-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DUST PAN', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 8, 'piece', 10, 47.5, '47131601-DU-P01', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DUST PAN' AND barcode_value = '47131601-DU-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FLOOR WAX, paste type, red', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 0, 'can', 10, 314.41, '47131802-FW-P02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FLOOR WAX, paste type, red' AND barcode_value = '47131802-FW-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FURNITURE CLEANER', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 12, 'can', 10, 143.51, '47131830-FC-A01', 'expendable_supply', NULL, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FURNITURE CLEANER' AND barcode_value = '47131830-FC-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'HAND SOAP, liquid, 500mL', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'bottle', 10, 43.6, '73101612-HS-L01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'HAND SOAP, liquid, 500mL' AND barcode_value = '73101612-HS-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MOP BUCKET', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 12, 'unit', 10, 2322.32, '47121804-MP-B01', 'expendable_supply', NULL, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MOP BUCKET' AND barcode_value = '47121804-MP-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RAGS', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'bundle', 10, 78.11, '47131501-RG-C01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RAGS' AND barcode_value = '47131501-RG-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SCOURING PAD', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'pack', 10, 86.92, '47131602-SC-N01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SCOURING PAD' AND barcode_value = '47131602-SC-N01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TRASHBAG, XXL size', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 40, 'pack', 10, 131.95, '47121701-TB-P04', 'expendable_supply', NULL, 10, 0, 0, 10, 0, 0, 10, 0, 0, 10, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TRASHBAG, XXL size' AND barcode_value = '47121701-TB-P04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TRASHBAG, Large size', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 30, 'pack', 10, 59.28, '47121701-TB-P05', 'expendable_supply', NULL, 10, 0, 0, 5, 0, 0, 10, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TRASHBAG, Large size' AND barcode_value = '47121701-TB-P05')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TRASHBAG, XL size', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 20, 'pack', 10, 92.56, '47121701-TB-P06', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TRASHBAG, XL size' AND barcode_value = '47121701-TB-P06')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WASTEBASKET', NULL, (SELECT id FROM categories WHERE name = 'CLEANING EQUIPMENT AND SUPPLIES'), 'supply', 5, 'piece', 10, 44.34, '47121702-WB-P01', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WASTEBASKET' AND barcode_value = '47121702-WB-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAMP PAD, INK', NULL, (SELECT id FROM categories WHERE name = 'COLOR COMPOUNDS AND DISPERSIONS'), 'supply', 4, 'bottle', 10, 29.22, '12171703-SI-P01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAMP PAD, INK' AND barcode_value = '12171703-SI-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DIGITAL VOICE RECORDER', NULL, (SELECT id FROM categories WHERE name = 'CONSUMER ELECTRONICS'), 'supply', 0, 'unit', 10, 7449.24, '52161535-DV-R01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DIGITAL VOICE RECORDER' AND barcode_value = '52161535-DV-R01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ACETATE', NULL, (SELECT id FROM categories WHERE name = 'FILMS'), 'supply', 2, 'roll', 10, 1262.5, '13111203-AC-F01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ACETATE' AND barcode_value = '13111203-AC-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CARBON FILM, Legal size', NULL, (SELECT id FROM categories WHERE name = 'FILMS'), 'supply', 1, 'box', 10, 357.11, '13111201-CF-P02', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CARBON FILM, Legal size' AND barcode_value = '13111201-CF-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FIRE EXTINGUISHER, dry chemical', NULL, (SELECT id FROM categories WHERE name = 'FIRE FIGHTING EQUIPMENT'), 'supply', 2, 'unit', 10, 1161.16, '46191601-FE-M01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FIRE EXTINGUISHER, dry chemical' AND barcode_value = '46191601-FE-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PHILIPPINE NATIONAL FLAG', NULL, (SELECT id FROM categories WHERE name = 'FLAG OR ACCESSORIES'), 'supply', 4, 'piece', 10, 289.11, '55121905-PH-F01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PHILIPPINE NATIONAL FLAG' AND barcode_value = '55121905-PH-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MONOBLOC CHAIR, beige', NULL, (SELECT id FROM categories WHERE name = 'FURNITURE AND FURNISHINGS'), 'supply', 0, 'piece', 10, 359.96, '56101504-CM-B01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MONOBLOC CHAIR, beige' AND barcode_value = '56101504-CM-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MONOBLOC CHAIR, white', NULL, (SELECT id FROM categories WHERE name = 'FURNITURE AND FURNISHINGS'), 'supply', 0, 'piece', 10, 359.96, '56101504-CM-W01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MONOBLOC CHAIR, white' AND barcode_value = '56101504-CM-W01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ELECTRIC FAN, ceiling mount, orbit type', NULL, (SELECT id FROM categories WHERE name = 'HEATING AND VENTILATION AND AIR CIRCULATION'), 'supply', 0, 'unit', 10, 1459.89, '40101604-EF-C01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ELECTRIC FAN, ceiling mount, orbit type' AND barcode_value = '40101604-EF-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ELECTRIC FAN, industrial, ground type', NULL, (SELECT id FROM categories WHERE name = 'HEATING AND VENTILATION AND AIR CIRCULATION'), 'supply', 0, 'unit', 10, 1372.28, '40101604-EF-G01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ELECTRIC FAN, industrial, ground type' AND barcode_value = '40101604-EF-G01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ELECTRIC FAN, stand type', NULL, (SELECT id FROM categories WHERE name = 'HEATING AND VENTILATION AND AIR CIRCULATION'), 'supply', 0, 'unit', 10, 1583.4, '40101604-EF-S01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ELECTRIC FAN, stand type' AND barcode_value = '40101604-EF-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ELECTRIC FAN, wall mount', NULL, (SELECT id FROM categories WHERE name = 'HEATING AND VENTILATION AND AIR CIRCULATION'), 'supply', 6, 'unit', 10, 915.21, '40101604-EF-W01', 'expendable_supply', NULL, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ELECTRIC FAN, wall mount' AND barcode_value = '40101604-EF-W01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DESKTOP, for Basic Users', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 25165.5, '43211507-DSK001', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DESKTOP, for Basic Users' AND barcode_value = '43211507-DSK001')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DESKTOP, for Mid-Range Users', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 43026.26, '43211507-DSK002', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DESKTOP, for Mid-Range Users' AND barcode_value = '43211507-DSK002')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'EXTERNAL HARD DRIVE', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 3060.18, '43201827-HD-X02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'EXTERNAL HARD DRIVE' AND barcode_value = '43201827-HD-X02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FLASH DRIVE', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'piece', 10, 155.04, '43202010-FD-U04', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FLASH DRIVE' AND barcode_value = '43202010-FD-U04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LAPTOP COMPUTER, Mid-range', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 43015.7, '43211503-LAP001', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LAPTOP COMPUTER, Mid-range' AND barcode_value = '43211503-LAP001')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LAPTOP COMPUTER, Lightweight', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 47502, '43211503-LAP002', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LAPTOP COMPUTER, Lightweight' AND barcode_value = '43211503-LAP002')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'COMPUTER MOUSE, Wireless', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 4, 'unit', 10, 161.79, '43211708-MO-O02', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'COMPUTER MOUSE, Wireless' AND barcode_value = '43211708-MO-O02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PRINTER, Laser, Monochrome', NULL, (SELECT id FROM categories WHERE name = 'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES'), 'supply', 0, 'unit', 10, 9339.95, '43212105-PR-L01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PRINTER, Laser, Monochrome' AND barcode_value = '43212105-PR-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LIGHT-EMITTING DIODE (LED) LIGHT BULB, 7 watts', NULL, (SELECT id FROM categories WHERE name = 'LIGHTING AND FIXTURES AND ACCESSORIES'), 'supply', 20, 'piece', 10, 76.74, '39101628-LB-L01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LIGHT-EMITTING DIODE (LED) LIGHT BULB, 7 watts' AND barcode_value = '39101628-LB-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LIGHT-EMITTING DIODE (LED) LINEAR TUBE, 18 watts', NULL, (SELECT id FROM categories WHERE name = 'LIGHTING AND FIXTURES AND ACCESSORIES'), 'supply', 15, 'piece', 10, 208.9, '39101628-LT-L01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LIGHT-EMITTING DIODE (LED) LINEAR TUBE, 18 watts' AND barcode_value = '39101628-LT-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'GLUE, all-purpose', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 20, 'bottle', 10, 63.07, '31201610-GL-J01', 'expendable_supply', NULL, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'GLUE, all-purpose' AND barcode_value = '31201610-GL-J01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAPLE WIRE, heavy duty (binder type), 23/13', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 4, 'box', 10, 36.95, '31151804-SW-H01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAPLE WIRE, heavy duty (binder type), 23/13' AND barcode_value = '31151804-SW-H01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAPLE WIRE, standard', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 12, 'box', 10, 28.5, '31151804-SW-S01', 'expendable_supply', NULL, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAPLE WIRE, standard' AND barcode_value = '31151804-SW-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, electrical', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 10, 'roll', 10, 19.74, '31201502-TA-E01', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, electrical' AND barcode_value = '31201502-TA-E01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, masking, 24mm', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 10, 'roll', 10, 59.11, '31201503-TA-M01', 'expendable_supply', NULL, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, masking, 24mm' AND barcode_value = '31201503-TA-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, masking, 48 mm', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 2, 'roll', 10, 140.39, '31201503-TA-M02', 'expendable_supply', NULL, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, masking, 48 mm' AND barcode_value = '31201503-TA-M02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, packaging, 48 mm', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 4, 'roll', 10, 29.56, '31201517-TA-P01', 'expendable_supply', NULL, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, packaging, 48 mm' AND barcode_value = '31201517-TA-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, transparent, 24mm', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 10, 'roll', 10, 17.95, '31201512-TA-T01', 'expendable_supply', NULL, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, transparent, 24mm' AND barcode_value = '31201512-TA-T01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE, transparent, 48 mm', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 4, 'roll', 10, 29.56, '31201512-TA-T02', 'expendable_supply', NULL, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE, transparent, 48 mm' AND barcode_value = '31201512-TA-T02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TWINE, plastic', NULL, (SELECT id FROM categories WHERE name = 'MANUFACTURING COMPONENTS AND SUPPLIES'), 'supply', 0, 'roll', 10, 71.78, '31151507-TW-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TWINE, plastic' AND barcode_value = '31151507-TW-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RULER, plastic, 450mm', NULL, (SELECT id FROM categories WHERE name = 'MEASURING AND OBSERVING AND TESTING EQUIPMENT'), 'supply', 10, 'piece', 10, 20.23, '41111604-RU-P02', 'expendable_supply', NULL, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RULER, plastic, 450mm' AND barcode_value = '41111604-RU-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BLADE, for general purpose cutter/utility knife', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'tube', 10, 16.62, '44121612-BL-H01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BLADE, for general purpose cutter/utility knife' AND barcode_value = '44121612-BL-H01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BINDING AND PUNCHING MACHINE', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'unit', 10, 13287.89, '44101602-PB-M01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BINDING AND PUNCHING MACHINE' AND barcode_value = '44101602-PB-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BINDING RING/COMB, plastic, 32 mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'bundle', 10, 222.49, '44122037-RB-P10', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BINDING RING/COMB, plastic, 32 mm' AND barcode_value = '44122037-RB-P10')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CALCULATOR, Compact', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'unit', 10, 220.49, '44101807-CA-C01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CALCULATOR, Compact' AND barcode_value = '44101807-CA-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CHALK, white enamel', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 33.46, '44121710-CH-W01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CHALK, white enamel' AND barcode_value = '44121710-CH-W01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLIP, backfold, 19mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'box', 10, 11.29, '44122105-BF-C01', 'expendable_supply', NULL, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLIP, backfold, 19mm' AND barcode_value = '44122105-BF-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLIP, backfold, 25mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'box', 10, 19.91, '44122105-BF-C02', 'expendable_supply', NULL, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLIP, backfold, 25mm' AND barcode_value = '44122105-BF-C02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLIP, backfold, 32mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'box', 10, 29.35, '44122105-BF-C03', 'expendable_supply', NULL, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLIP, backfold, 32mm' AND barcode_value = '44122105-BF-C03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLIP, backfold, 50mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 10, 'box', 10, 63.83, '44122105-BF-C04', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLIP, backfold, 50mm' AND barcode_value = '44122105-BF-C04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CORRECTION TAPE', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 10, 'piece', 10, 19.48, '44121801-CT-R02', 'expendable_supply', NULL, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CORRECTION TAPE' AND barcode_value = '44121801-CT-R02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CUTTER/UTILITY KNIFE, HEAVY DUTY', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 10, 'piece', 10, 30.08, '44121612-CU-H01', 'expendable_supply', NULL, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CUTTER/UTILITY KNIFE, HEAVY DUTY' AND barcode_value = '44121612-CU-H01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DATA FILE BOX', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 30, 'piece', 10, 151.25, '44111515-DF-B01', 'expendable_supply', NULL, 10, 0, 0, 10, 0, 0, 10, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DATA FILE BOX' AND barcode_value = '44111515-DF-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DATA FOLDER', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 16, 'piece', 10, 101.34, '44122011-DF-F01', 'expendable_supply', NULL, 8, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DATA FOLDER' AND barcode_value = '44122011-DF-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DATER STAMP', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'piece', 10, 432.16, '44103202-DS-M01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DATER STAMP' AND barcode_value = '44103202-DS-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Documentary, A4', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 2, 'box', 10, 860.31, '44121506-EN-D01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Documentary, A4' AND barcode_value = '44121506-EN-D01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Documentary, legal,', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'box', 10, 1033.38, '44121506-EN-D02', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Documentary, legal,' AND barcode_value = '44121506-EN-D02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Expanding, Kraft', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 975.37, '44121506-EN-X01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Expanding, Kraft' AND barcode_value = '44121506-EN-X01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Expanding, Plastic', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 30.95, '44121506-EN-X02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Expanding, Plastic' AND barcode_value = '44121506-EN-X02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Mailing', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'box', 10, 467.42, '44121506-EN-M02', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Mailing' AND barcode_value = '44121506-EN-M02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ENVELOPE, Mailing, with window', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 531.81, '44121504-EN-W02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ENVELOPE, Mailing, with window' AND barcode_value = '44121504-EN-W02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ERASER, felt, for blackboard/whiteboard', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 10, 'piece', 10, 14.69, '44111912-ER-B01', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ERASER, felt, for blackboard/whiteboard' AND barcode_value = '44111912-ER-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FASTENER, METAL, NON-SHARP EDGES', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 96.06, '44122118-FA-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FASTENER, METAL, NON-SHARP EDGES' AND barcode_value = '44122118-FA-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FILE ORGANIZER', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 5, 'piece', 10, 129.31, '44111515-FO-X01', 'expendable_supply', NULL, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FILE ORGANIZER' AND barcode_value = '44111515-FO-X01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FILE TAB DIVIDER, A4', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'set', 10, 11.29, '44122018-FT-D01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FILE TAB DIVIDER, A4' AND barcode_value = '44122018-FT-D01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FILE TAB DIVIDER, Legal', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'set', 10, 14.44, '44122018-FT-D02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FILE TAB DIVIDER, Legal' AND barcode_value = '44122018-FT-D02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER, MOROCCO WITH SLIDE, A4', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'bundle', 10, 274.46, '44122011-FO-F01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER, MOROCCO WITH SLIDE, A4' AND barcode_value = '44122011-FO-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER, MOROCCO WITH SLIDE, LEGAL', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'bundle', 10, 306.12, '44122011-FO-F02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER, MOROCCO WITH SLIDE, LEGAL' AND barcode_value = '44122011-FO-F02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER, L-type, A4', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'pack', 10, 192.44, '44122011-FO-L01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER, L-type, A4' AND barcode_value = '44122011-FO-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER, L-type, Legal', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'pack', 10, 252.82, '44122011-FO-L02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER, L-type, Legal' AND barcode_value = '44122011-FO-L02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER, pressboard', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 1979.25, '44122027-FO-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER, pressboard' AND barcode_value = '44122027-FO-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER with tab, A4', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'pack', 10, 385.29, '44122011-FO-T01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER with tab, A4' AND barcode_value = '44122011-FO-T01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FOLDER with tab, Legal', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 14, 'pack', 10, 420.13, '44122011-FO-T02', 'expendable_supply', NULL, 5, 0, 0, 2, 0, 0, 5, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FOLDER with tab, Legal' AND barcode_value = '44122011-FO-T02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INDEX TAB', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 69.44, '44122008-IT-T01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INDEX TAB' AND barcode_value = '44122008-IT-T01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Flourescent', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'set', 10, 31.57, '44121716-MA-F01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Flourescent' AND barcode_value = '44121716-MA-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Permanent, Black', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 15.83, '44121708-MP-B01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Permanent, Black' AND barcode_value = '44121708-MP-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Permanent, Blue', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 11, 'piece', 10, 15.32, '44121708-MP-B02', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Permanent, Blue' AND barcode_value = '44121708-MP-B02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Permanent, Red', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 15.13, '44121708-MP-B03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Permanent, Red' AND barcode_value = '44121708-MP-B03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Whiteboard, Black', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 20, 'piece', 10, 22.17, '44121708-MW-B01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Whiteboard, Black' AND barcode_value = '44121708-MW-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Whiteboard, Blue', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 6, 'piece', 10, 22.17, '44121708-MW-B02', 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Whiteboard, Blue' AND barcode_value = '44121708-MW-B02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MARKER, Whiteboard, Red', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 4, 'piece', 10, 22.17, '44121708-MW-B03', 'expendable_supply', NULL, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MARKER, Whiteboard, Red' AND barcode_value = '44121708-MW-B03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER CLIP, vinly/plastic coated, 33mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 8.97, '44122104-PC-G01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER CLIP, vinly/plastic coated, 33mm' AND barcode_value = '44122104-PC-G01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER CLIP, vinly/plastic coated, jumbo, 50mm', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'box', 10, 19.53, '44122104-PC-J02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER CLIP, vinly/plastic coated, jumbo, 50mm' AND barcode_value = '44122104-PC-J02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER SHREDDER', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'unit', 10, 16349.13, '44101603-PS-M02', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER SHREDDER' AND barcode_value = '44101603-PS-M02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER TRIMMER/CUTTING MACHINE', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'unit', 10, 10021.87, '44101601-PT-M02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER TRIMMER/CUTTING MACHINE' AND barcode_value = '44101601-PT-M02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PENCIL, lead/graphite, with eraser', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 2, 'box', 10, 45.38, '44121706-PE-L01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PENCIL, lead/graphite, with eraser' AND barcode_value = '44121706-PE-L01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PENCIL SHARPENER', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'piece', 10, 241.73, '44121619-PS-M01', 'expendable_supply', NULL, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PENCIL SHARPENER' AND barcode_value = '44121619-PS-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PUNCHER, paper, heavy duty', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 4, 'piece', 10, 156.76, '44101602-PU-P01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PUNCHER, paper, heavy duty' AND barcode_value = '44101602-PU-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RUBBER BAND No. 18', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 1, 'box', 10, 146.73, '44122101-RU-B01', 'expendable_supply', NULL, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RUBBER BAND No. 18' AND barcode_value = '44122101-RU-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAMP PAD, felt', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 2, 'piece', 10, 40.51, '44121905-SP-F01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAMP PAD, felt' AND barcode_value = '44121905-SP-F01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SCISSORS, symmetrical/asymmetrical', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 10, 'pair', 10, 37.23, '44121618-SS-S01', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SCISSORS, symmetrical/asymmetrical' AND barcode_value = '44121618-SS-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAPLER, standard type', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 6, 'piece', 10, 200.56, '44121615-ST-S01', 'expendable_supply', NULL, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAPLER, standard type' AND barcode_value = '44121615-ST-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAPLER, heavy duty (binder)', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 2, 'unit', 10, 597.87, '44121615-ST-B01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAPLER, heavy duty (binder)' AND barcode_value = '44121615-ST-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STAPLE REMOVER, plier-type', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 0, 'piece', 10, 35.89, '44121613-SR-P02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STAPLE REMOVER, plier-type' AND barcode_value = '44121613-SR-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TAPE DISPENSER, table top', NULL, (SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'), 'supply', 2, 'unit', 10, 78.52, '44121605-TD-T01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TAPE DISPENSER, table top' AND barcode_value = '44121605-TD-T01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CARTOLINA, assorted colors', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 2, 'pack', 10, 84.98, '14111525-CA-A01', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CARTOLINA, assorted colors' AND barcode_value = '14111525-CA-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'COMPUTER CONTINUOUS FORM, 1 ply, 280mm x 241mm', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'box', 10, 985.93, '14111506-CF-L11', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'COMPUTER CONTINUOUS FORM, 1 ply, 280mm x 241mm' AND barcode_value = '14111506-CF-L11')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'COMPUTER CONTINUOUS FORM, 1 ply, 280mm x 378mm', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'box', 10, 1817.22, '14111506-CF-L12', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'COMPUTER CONTINUOUS FORM, 1 ply, 280mm x 378mm' AND barcode_value = '14111506-CF-L12')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'NOTEPAD, stick-on, 50mm x 76mm', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 7, 'pad', 10, 37.61, '14111514-NP-S02', 'expendable_supply', NULL, 5, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'NOTEPAD, stick-on, 50mm x 76mm' AND barcode_value = '14111514-NP-S02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'NOTEPAD, stick-on, 76mm x 100mm', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'pad', 10, 60.17, '14111514-NP-S04', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'NOTEPAD, stick-on, 76mm x 100mm' AND barcode_value = '14111514-NP-S04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'NOTEPAD, stick-on, 76mm x 76mm', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 6, 'pad', 10, 52.78, '14111514-NP-S03', 'expendable_supply', NULL, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'NOTEPAD, stick-on, 76mm x 76mm' AND barcode_value = '14111514-NP-S03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STENO NOTEBOOK', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'piece', 10, 11.45, '14111514-NB-S02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STENO NOTEBOOK' AND barcode_value = '14111514-NB-S02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, MULTICOPY A4', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 20, 'ream', 10, 213.86, '14111507-PP-M01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, MULTICOPY A4' AND barcode_value = '14111507-PP-M01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, MULTICOPY LEGAL', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'ream', 10, 227.64, '14111507-PP-M02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, MULTICOPY LEGAL' AND barcode_value = '14111507-PP-M02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, MULTIPURPOSE A4', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 120, 'ream', 10, 139.8, '14111507-PP-C01', 'expendable_supply', NULL, 30, 0, 0, 30, 0, 0, 30, 0, 0, 30, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, MULTIPURPOSE A4' AND barcode_value = '14111507-PP-C01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, MULTIPURPOSE LEGAL', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'ream', 10, 161.3, '14111507-PP-C02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, MULTIPURPOSE LEGAL' AND barcode_value = '14111507-PP-C02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAD PAPER, ruled', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'pad', 10, 43.79, '14111531-PP-R01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAD PAPER, ruled' AND barcode_value = '14111531-PP-R01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, parchment', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 0, 'box', 10, 156.52, '14111503-PA-P01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, parchment' AND barcode_value = '14111503-PA-P01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RECORD BOOK, 300 PAGES', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 4, 'book', 10, 93.07, '14111531-RE-B01', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RECORD BOOK, 300 PAGES' AND barcode_value = '14111531-RE-B01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RECORD BOOK, 500 PAGES', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 4, 'book', 10, 126.43, '14111531-RE-B02', 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RECORD BOOK, 500 PAGES' AND barcode_value = '14111531-RE-B02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TISSUE, INTERFOLDED PAPER TOWEL', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 26, 'pack', 10, 34.31, '14111704-TT-P04', 'expendable_supply', NULL, 8, 0, 0, 5, 0, 0, 5, 0, 0, 8, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TISSUE, INTERFOLDED PAPER TOWEL' AND barcode_value = '14111704-TT-P04')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TOILET TISSUE PAPER, 2 ply', NULL, (SELECT id FROM categories WHERE name = 'PAPER MATERIALS AND PRODUCTS'), 'supply', 30, 'pack', 10, 100.88, '14111704-TT-P02', 'expendable_supply', NULL, 10, 0, 0, 5, 0, 0, 5, 0, 0, 10, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TOILET TISSUE PAPER, 2 ply' AND barcode_value = '14111704-TT-P02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'HAND SANITIZER', NULL, (SELECT id FROM categories WHERE name = 'PERFUMES OR COLOGNES OR FRAGRANCES'), 'supply', 20, 'bottle', 10, 84.45, '53131626-HS-S01', 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'HAND SANITIZER' AND barcode_value = '53131626-HS-S01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INSECTICIDE', NULL, (SELECT id FROM categories WHERE name = 'PESTICIDES OR PEST REPELLENTS'), 'supply', 12, 'can', 10, 260.47, '10191509-IN-A01', 'expendable_supply', NULL, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INSECTICIDE' AND barcode_value = '10191509-IN-A01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'HANDBOOK ON PHILIPPINE GOVERNMENT PROCUREMENT (RA 9184 and its IRR)', NULL, (SELECT id FROM categories WHERE name = 'PRINTED PUBLICATIONS'), 'supply', 0, 'book', 10, 37.77, '55101524-RA-H01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'HANDBOOK ON PHILIPPINE GOVERNMENT PROCUREMENT (RA 9184 and its IRR)' AND barcode_value = '55101524-RA-H01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DRUM CARTRIDGE, BROTHER DR-3455, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 7051.41, '44103109-BR-D05', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DRUM CARTRIDGE, BROTHER DR-3455, Black' AND barcode_value = '44103109-BR-D05')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, EPSON C13T664300 (T6643), Magenta', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 245.83, '44103105-EP-M17', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, EPSON C13T664300 (T6643), Magenta' AND barcode_value = '44103105-EP-M17')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, EPSON C13T664400 (T6644), Yellow', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 245.83, '44103105-EP-Y17', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, EPSON C13T664400 (T6644), Yellow' AND barcode_value = '44103105-EP-Y17')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, HP CH561WA (HP61), Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 878.26, '44103105-HP-B20', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, HP CH561WA (HP61), Black' AND barcode_value = '44103105-HP-B20')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, HP CN047AA (HP951XL), Magenta', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 1540.12, '44103105-HX-M43', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, HP CN047AA (HP951XL), Magenta' AND barcode_value = '44103105-HX-M43')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, HP CN693AA (HP704), Tri-color', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 425.41, '44103105-HP-T36', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, HP CN693AA (HP704), Tri-color' AND barcode_value = '44103105-HP-T36')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, HP CZ107AA (HP678), Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 410.63, '44103105-HP-B33', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, HP CZ107AA (HP678), Black' AND barcode_value = '44103105-HP-B33')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INK CARTRIDGE, HP CZ108AA (HP678), Tri-color', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 410.63, '44103105-HP-T33', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INK CARTRIDGE, HP CZ108AA (HP678), Tri-color' AND barcode_value = '44103105-HP-T33')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RIBBON CARTRIDGE, EPSON C13S015516 (#8750), Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 78.59, '44103112-EP-R05', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RIBBON CARTRIDGE, EPSON C13S015516 (#8750), Black' AND barcode_value = '44103112-EP-R05')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RIBBON CARTRIDGE, EPSON C13S015632, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 79.11, '44103112-EP-R13', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RIBBON CARTRIDGE, EPSON C13S015632, Black' AND barcode_value = '44103112-EP-R13')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'RIBBON CARTRIDGE, EPSON C13S015531 (S015086)', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 830.76, '44103112-EP-R07', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'RIBBON CARTRIDGE, EPSON C13S015531 (S015086)' AND barcode_value = '44103112-EP-R07')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-3320, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 3620.71, '44103103-BR-B09', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-3320, Black' AND barcode_value = '44103103-BR-B09')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-3350, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 5077.44, '44103103-BR-B11', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-3350, Black' AND barcode_value = '44103103-BR-B11')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-3478, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 5659.07, '44103103-BR-B15', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-3478, Black' AND barcode_value = '44103103-BR-B15')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-456 Black, High Yield', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4633.03, '44103103-BR-B16', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-456 Black, High Yield' AND barcode_value = '44103103-BR-B16')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-456 Cyan, High Yield', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 7832.55, '44103103-BR-C03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-456 Cyan, High Yield' AND barcode_value = '44103103-BR-C03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-456 Magenta, High Yield', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 7832.55, '44103103-BR-M03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-456 Magenta, High Yield' AND barcode_value = '44103103-BR-M03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, BROTHER TN-456 Yellow, High Yield', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 7832.55, '44103103-BR-Y03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, BROTHER TN-456 Yellow, High Yield' AND barcode_value = '44103103-BR-Y03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, CANON CRG-324 II', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 14145.04, '44103103-CA-B00', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, CANON CRG-324 II' AND barcode_value = '44103103-CA-B00')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CB435A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 3490.87, '44103103-HP-B12', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CB435A, Black' AND barcode_value = '44103103-HP-B12')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CE255A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 7820.94, '44103103-HP-B18', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CE255A, Black' AND barcode_value = '44103103-HP-B18')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CE278A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4215.01, '44103103-HP-B21', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CE278A, Black' AND barcode_value = '44103103-HP-B21')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CE285A (HP85A), Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 3652.38, '44103103-HP-B22', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CE285A (HP85A), Black' AND barcode_value = '44103103-HP-B22')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CE310A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 2647.44, '44103103-HP-B23', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CE310A, Black' AND barcode_value = '44103103-HP-B23')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CE505A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4563.36, '44103103-HP-B28', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CE505A, Black' AND barcode_value = '44103103-HP-B28')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF217A (HP17A), Black LaserJet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 3242.8, '44103103-HP-B52', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF217A (HP17A), Black LaserJet' AND barcode_value = '44103103-HP-B52')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF281A (HP81A), Black LaserJet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 8787.87, '44103103-HP-B56', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF281A (HP81A), Black LaserJet' AND barcode_value = '44103103-HP-B56')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF287A (HP87), Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 11072.19, '44103103-HP-B58', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF287A (HP87), Black' AND barcode_value = '44103103-HP-B58')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF350A, Black Laserjet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 2899.73, '44103103-HP-B60', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF350A, Black Laserjet' AND barcode_value = '44103103-HP-B60')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF351A, Cyan Laserjet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 2987.35, '44103103-HP-C60', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF351A, Cyan Laserjet' AND barcode_value = '44103103-HP-C60')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF352A, Yellow Laserjet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 2987.35, '44103103-HP-Y60', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF352A, Yellow Laserjet' AND barcode_value = '44103103-HP-Y60')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF353A, Magenta Laserjet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 2987.35, '44103103-HP-M60', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF353A, Magenta Laserjet' AND barcode_value = '44103103-HP-M60')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF400A (HP201A), Black LaserJet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 3490.87, '44103103-HP-B62', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF400A (HP201A), Black LaserJet' AND barcode_value = '44103103-HP-B62')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF403A (HP201A), Magenta LaserJet', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4124.23, '44103103-HP-M62', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF403A (HP201A), Magenta LaserJet' AND barcode_value = '44103103-HP-M62')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP CF413A (HP410A), Magenta', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 5675.96, '44103103-HP-M63', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP CF413A (HP410A), Magenta' AND barcode_value = '44103103-HP-M63')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP Q2612A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4218.18, '44103103-HP-B34', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP Q2612A, Black' AND barcode_value = '44103103-HP-B34')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TONER CARTRIDGE, HP Q7553A, Black', NULL, (SELECT id FROM categories WHERE name = 'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)'), 'supply', 0, 'cart', 10, 4750.2, '44103103-HP-B48', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TONER CARTRIDGE, HP Q7553A, Black' AND barcode_value = '44103103-HP-B48')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Business function specific software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43231513-SFT-001', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Business function specific software' AND barcode_value = '43231513-SFT-001')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Finance accounting and enterprise resource planning ERP software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43231602-SFT-002', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Finance accounting and enterprise resource planning ERP software' AND barcode_value = '43231602-SFT-002')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Interactive or entertainment software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232004-SFT-003', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Interactive or entertainment software' AND barcode_value = '43232004-SFT-003')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Content authoring and editing software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232107-SFT-004', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Content authoring and editing software' AND barcode_value = '43232107-SFT-004')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Content management software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232202-SFT-005', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Content management software' AND barcode_value = '43232202-SFT-005')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Data management and query software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 1, 'license', 10, 0, '43232304-SFT-006', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Data management and query software' AND barcode_value = '43232304-SFT-006')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Development software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232402-SFT-007', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Development software' AND barcode_value = '43232402-SFT-007')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Educational or reference software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232505-SFT-008', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Educational or reference software' AND barcode_value = '43232505-SFT-008')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Industry specific software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232603-SFT-009', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Industry specific software' AND barcode_value = '43232603-SFT-009')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Information exchange software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43233501-SFT-016', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Information exchange software' AND barcode_value = '43233501-SFT-016')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Network applications software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 1, 'license', 10, 0, '43232701-SFT-010', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Network applications software' AND barcode_value = '43232701-SFT-010')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Network management software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 1, 'license', 10, 0, '43232802-SFT-011', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Network management software' AND barcode_value = '43232802-SFT-011')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Networking software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43232905-SFT-012', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Networking software' AND barcode_value = '43232905-SFT-012')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Operating environment software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43233004-SFT-013', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Operating environment software' AND barcode_value = '43233004-SFT-013')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Security and protection software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 1, 'license', 10, 0, '43233205-SFT-014', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Security and protection software' AND barcode_value = '43233205-SFT-014')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Utility and device driver software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '43233405-SFT-015', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Utility and device driver software' AND barcode_value = '43233405-SFT-015')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'Electrical Equipment Software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 0, 'license', 10, 0, '80141505-TS-066', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Electrical Equipment Software' AND barcode_value = '80141505-TS-066')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'System Management Software', NULL, (SELECT id FROM categories WHERE name = 'SOFTWARE'), 'supply', 1, 'license', 10, 0, '80141505-TS-067', 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'System Management Software' AND barcode_value = '80141505-TS-067')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIRLINE TICKETS (DOMESTIC)', NULL, (SELECT id FROM categories WHERE name = 'AIRLINE TICKETS'), 'supply', 8, 'ticket', 10, 4950, '80141505-TS-051', 'expendable_supply', NULL, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIRLINE TICKETS (DOMESTIC)' AND barcode_value = '80141505-TS-051')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIRLINE TICKETS (INTERNATIONAL)', NULL, (SELECT id FROM categories WHERE name = 'AIRLINE TICKETS'), 'supply', 0, 'ticket', 10, 0, '80141505-TS-052', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIRLINE TICKETS (INTERNATIONAL)' AND barcode_value = '80141505-TS-052')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ALL-TERRAIN VEHICLE (ATV)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-060', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ALL-TERRAIN VEHICLE (ATV)' AND barcode_value = '80141505-TS-060')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ALTERNATE FUELED VEHICLE (AFV)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-068', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ALTERNATE FUELED VEHICLE (AFV)' AND barcode_value = '80141505-TS-068')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ASSEMBLED OWNER-TYPE JEEP', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-061', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ASSEMBLED OWNER-TYPE JEEP' AND barcode_value = '80141505-TS-061')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ASSEMBLED PASSENGER JEEPNEY-TYPE VEHICLE', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-062', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ASSEMBLED PASSENGER JEEPNEY-TYPE VEHICLE' AND barcode_value = '80141505-TS-062')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BUS (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-BU-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BUS (ENTRY LEVEL)' AND barcode_value = '25101503-BU-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BUS (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-BU-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BUS (MID LEVEL)' AND barcode_value = '25101503-BU-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BUS (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-BU-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BUS (TOP LEVEL)' AND barcode_value = '25101503-BU-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CAR (SEDAN OR HATCHBACK) (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 1, 'unit', 10, 500000, '25101503-CA-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CAR (SEDAN OR HATCHBACK) (ENTRY LEVEL)' AND barcode_value = '25101503-CA-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CAR (SEDAN OR HATCHBACK) (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-CA-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CAR (SEDAN OR HATCHBACK) (MID LEVEL)' AND barcode_value = '25101503-CA-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CAR (SEDAN OR HATCHBACK) (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-CA-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CAR (SEDAN OR HATCHBACK) (TOP LEVEL)' AND barcode_value = '25101503-CA-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MINI BUS (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-MI-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MINI BUS (ENTRY LEVEL)' AND barcode_value = '25101503-MI-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MINI BUS (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-MI-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MINI BUS (MID LEVEL)' AND barcode_value = '25101503-MI-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MINI BUS (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-MI-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MINI BUS (TOP LEVEL)' AND barcode_value = '25101503-MI-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MOTORCYCLE', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-063', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MOTORCYCLE' AND barcode_value = '80141505-TS-063')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MULTI-PURPOSE VEHICLE (MPV)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-MU-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MULTI-PURPOSE VEHICLE (MPV)' AND barcode_value = '25101503-MU-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PASSENGER VAN (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PA-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PASSENGER VAN (ENTRY LEVEL)' AND barcode_value = '25101503-PA-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PASSENGER VAN (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PA-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PASSENGER VAN (MID LEVEL)' AND barcode_value = '25101503-PA-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PASSENGER VAN (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PA-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PASSENGER VAN (TOP LEVEL)' AND barcode_value = '25101503-PA-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PICK-UP TRUCK (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PI-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PICK-UP TRUCK (ENTRY LEVEL)' AND barcode_value = '25101503-PI-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PICK-UP TRUCK (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PI-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PICK-UP TRUCK (MID LEVEL)' AND barcode_value = '25101503-PI-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PICK-UP TRUCK (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-PI-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PICK-UP TRUCK (TOP LEVEL)' AND barcode_value = '25101503-PI-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SPORTS UTILITY VEHICLE (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-SP-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SPORTS UTILITY VEHICLE (ENTRY LEVEL)' AND barcode_value = '25101503-SP-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SPORTS UTILITY VEHICLE (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-SP-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SPORTS UTILITY VEHICLE (TOP LEVEL)' AND barcode_value = '25101503-SP-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TRI-WHEEL VEHICLE', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '80141505-TS-058', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TRI-WHEEL VEHICLE' AND barcode_value = '80141505-TS-058')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'UTILITY VAN (ENTRY LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-UT-V01', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'UTILITY VAN (ENTRY LEVEL)' AND barcode_value = '25101503-UT-V01')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'UTILITY VAN (MID LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 1, 'unit', 10, 1500000, '25101503-UT-V02', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'UTILITY VAN (MID LEVEL)' AND barcode_value = '25101503-UT-V02')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'UTILITY VAN (TOP LEVEL)', NULL, (SELECT id FROM categories WHERE name = 'MOTOR VEHICLE'), 'supply', 0, 'unit', 10, 0, '25101503-UT-V03', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'UTILITY VAN (TOP LEVEL)' AND barcode_value = '25101503-UT-V03')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CLOUD COMPUTING SERVICES', NULL, (SELECT id FROM categories WHERE name = 'CLOUD COMPUTING SERVICES'), 'supply', 0, 'license', 10, 0, '80141505-TS-069', 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CLOUD COMPUTING SERVICES' AND barcode_value = '80141505-TS-069')
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.0 HP, CEILING TYPE', '[80141505-TS-072] AIR CONDITIONING UNIT, 1.0 HP, CEILING TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.0 HP, CEILING TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.0 HP, SPLIT TYPE', '[80141505-TS-078] AIR CONDITIONING UNIT, 1.0 HP, SPLIT TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.0 HP, SPLIT TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.0 HP, WALL TYPE', '[80141505-TS-075] AIR CONDITIONING UNIT, 1.0 HP, WALL TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.0 HP, WALL TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.0 HP, WINDOW TYPE', '[80141505-TS-011] AIR CONDITIONING UNIT, 1.0 HP, WINDOW TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.0 HP, WINDOW TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.5 HP, CEILING TYPE', '[80141505-TS-073] AIR CONDITIONING UNIT, 1.5 HP, CEILING TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.5 HP, CEILING TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.5 HP, SPLIT TYPE', '[80141505-TS-079] AIR CONDITIONING UNIT, 1.5 HP, SPLIT TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'unit', 10, 30000, NULL, 'expendable_supply', NULL, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.5 HP, SPLIT TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.5 HP, WALL TYPE', '[80141505-TS-076] AIR CONDITIONING UNIT, 1.5 HP, WALL TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.5 HP, WALL TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 1.5 HP, WINDOW TYPE', '[80141505-TS-070] AIR CONDITIONING UNIT, 1.5 HP, WINDOW TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 1.5 HP, WINDOW TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 2.0 HP, CEILING TYPE', '[80141505-TS-074] AIR CONDITIONING UNIT, 2.0 HP, CEILING TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 2.0 HP, CEILING TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 2.0 HP, SPLIT TYPE', '[80141505-TS-080] AIR CONDITIONING UNIT, 2.0 HP, SPLIT TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 2.0 HP, SPLIT TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 2.0 HP, WALL TYPE', '[80141505-TS-077] AIR CONDITIONING UNIT, 2.0 HP, WALL TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 2.0 HP, WALL TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR CONDITIONING UNIT, 2.0 HP, WINDOW TYPE', '[80141505-TS-071] AIR CONDITIONING UNIT, 2.0 HP, WINDOW TYPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR CONDITIONING UNIT, 2.0 HP, WINDOW TYPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AIR COOLER', '[80141505-TS-103] AIR COOLER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AIR COOLER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AMPLIFIER', '[80141505-TS-036] AMPLIFIER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AMPLIFIER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'ARROW FLAG (SIGN HERE)', '[80141505-TS-104] ARROW FLAG (SIGN HERE)', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'ARROW FLAG (SIGN HERE)' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'AUTOMOTIVE BATTERIES', '[80141505-TS-032] AUTOMOTIVE BATTERIES', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 2, 'piece', 10, 5000, NULL, 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'AUTOMOTIVE BATTERIES' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BALLPOINT PEN, EXTRA FINE TIP', '[80141505-TS-001] BALLPOINT PEN, EXTRA FINE TIP', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BALLPOINT PEN, EXTRA FINE TIP' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BALLPOINT PEN, FINE TIP', '[80141505-TS-081] BALLPOINT PEN, FINE TIP', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BALLPOINT PEN, FINE TIP' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BALLPOINT PEN, MEDIUM TIP', '[80141505-TS-082] BALLPOINT PEN, MEDIUM TIP', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BALLPOINT PEN, MEDIUM TIP' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BLEACHING SOLUTION', '[80141505-TS-007] BLEACHING SOLUTION', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 8, 'bottle', 10, 50, NULL, 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BLEACHING SOLUTION' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BLUETOOTH SPEAKER', '[80141505-TS-044] BLUETOOTH SPEAKER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BLUETOOTH SPEAKER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'BOND PAPER', '[80141505-TS-023] BOND PAPER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'ream', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'BOND PAPER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CCTV CAMERA', '[80141505-TS-083] CCTV CAMERA', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 3, 'unit', 10, 2000, NULL, 'expendable_supply', NULL, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CCTV CAMERA' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CERTIFICATE FRAME', '[80141505-TS-008] CERTIFICATE FRAME', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CERTIFICATE FRAME' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CERTIFICATE HOLDER, DOUBLE-SIDED, A4', '[80141505-TS-084] CERTIFICATE HOLDER, DOUBLE-SIDED, A4', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CERTIFICATE HOLDER, DOUBLE-SIDED, A4' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CERTIFICATE HOLDER, SINGLE-SIDED, A4', '[80141505-TS-009] CERTIFICATE HOLDER, SINGLE-SIDED, A4', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 20, 'piece', 10, 45, NULL, 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CERTIFICATE HOLDER, SINGLE-SIDED, A4' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'COMPACT DISC', '[80141505-TS-035] COMPACT DISC', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'COMPACT DISC' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CONFERENCE MICROPHONE', '[80141505-TS-014] CONFERENCE MICROPHONE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CONFERENCE MICROPHONE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'CONFERENCE SPEAKERPHONE', '[80141505-TS-085] CONFERENCE SPEAKERPHONE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'CONFERENCE SPEAKERPHONE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DEODORANT CAKE', '[80141505-TS-028] DEODORANT CAKE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DEODORANT CAKE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DISHWASHING LIQUID', '[80141505-TS-016] DISHWASHING LIQUID', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 30, 'bottle', 10, 50, NULL, 'expendable_supply', NULL, 10, 0, 0, 5, 0, 0, 5, 0, 0, 10, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DISHWASHING LIQUID' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DISPOSABLE GLOVES, LARGE', '[80141505-TS-087] DISPOSABLE GLOVES, LARGE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'box', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DISPOSABLE GLOVES, LARGE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DISPOSABLE GLOVES, NITRILE, MEDIUM', '[80141505-TS-086] DISPOSABLE GLOVES, NITRILE, MEDIUM', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'box', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DISPOSABLE GLOVES, NITRILE, MEDIUM' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DISPOSABLE GLOVES, NITRILE, SMALL', '[80141505-TS-029] DISPOSABLE GLOVES, NITRILE, SMALL', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'box', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DISPOSABLE GLOVES, NITRILE, SMALL' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOCUMENT SCANNER', '[80141505-TS-039] DOCUMENT SCANNER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOCUMENT SCANNER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOOR MAT', '[80141505-TS-025] DOOR MAT', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 20, 'piece', 10, 50, NULL, 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOOR MAT' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOUBLE-SIDED TAPE, FOAM, 12mm', '[80141505-TS-005] DOUBLE-SIDED TAPE, FOAM, 12mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 8, 'roll', 10, 60, NULL, 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOUBLE-SIDED TAPE, FOAM, 12mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOUBLE-SIDED TAPE, FOAM, 24mm', '[80141505-TS-088] DOUBLE-SIDED TAPE, FOAM, 24mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'roll', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOUBLE-SIDED TAPE, FOAM, 24mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOUBLE-SIDED TAPE, TISSUE, 12mm', '[80141505-TS-089] DOUBLE-SIDED TAPE, TISSUE, 12mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 8, 'roll', 10, 50, NULL, 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOUBLE-SIDED TAPE, TISSUE, 12mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DOUBLE-SIDED TAPE, TISSUE, 24mm', '[80141505-TS-090] DOUBLE-SIDED TAPE, TISSUE, 24mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'roll', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DOUBLE-SIDED TAPE, TISSUE, 24mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'DSLR CAMERA', '[80141505-TS-047] DSLR CAMERA', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'DSLR CAMERA' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'EXTENSION CORD', '[80141505-TS-020] EXTENSION CORD', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'piece', 10, 300, NULL, 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'EXTENSION CORD' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'EXTERNAL DRIVE, SOLID STATE DRIVE, 1TB', '[80141505-TS-091] EXTERNAL DRIVE, SOLID STATE DRIVE, 1TB', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'EXTERNAL DRIVE, SOLID STATE DRIVE, 1TB' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'FUEL FILTERS', '[80141505-TS-050] FUEL FILTERS', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'FUEL FILTERS' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'GLUE GUN', '[80141505-TS-042] GLUE GUN', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'GLUE GUN' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'GLUE STICK (FOR GLUE GUN)', '[80141505-TS-027] GLUE STICK (FOR GLUE GUN)', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'GLUE STICK (FOR GLUE GUN)' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'GLUE STICK PASTE, 15g', '[80141505-TS-092] GLUE STICK PASTE, 15g', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'GLUE STICK PASTE, 15g' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'GLUE STICK PASTE, 8g', '[80141505-TS-026] GLUE STICK PASTE, 8g', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'GLUE STICK PASTE, 8g' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'INTERACTIVE/DIGITAL WHITEBOARD', '[80141505-TS-105] INTERACTIVE/DIGITAL WHITEBOARD', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'INTERACTIVE/DIGITAL WHITEBOARD' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'KEYBOARD', '[80141505-TS-046] KEYBOARD', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'KEYBOARD' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LAMINATING FILM', '[80141505-TS-003] LAMINATING FILM', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LAMINATING FILM' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LAMINATING MACHINE', '[80141505-TS-049] LAMINATING MACHINE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LAMINATING MACHINE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LAPTOP FOR CREATIVE AND TECHNICAL USE', '[80141505-TS-107] LAPTOP FOR CREATIVE AND TECHNICAL USE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LAPTOP FOR CREATIVE AND TECHNICAL USE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'LOGISTICS SERVICES', '[80141505-TS-108] LOGISTICS SERVICES', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'lot', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'LOGISTICS SERVICES' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MEDAL', '[80141505-TS-015] MEDAL', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MEDAL' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MOBILE PHONE', '[80141505-TS-034] MOBILE PHONE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MOBILE PHONE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'MULTIFUNCTION PRINTER', '[80141505-TS-002] MULTIFUNCTION PRINTER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'MULTIFUNCTION PRINTER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'OFFICE CHAIR', '[80141505-TS-030] OFFICE CHAIR', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'OFFICE CHAIR' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PADLOCK, 40mm', '[80141505-TS-033] PADLOCK, 40mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PADLOCK, 40mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PADLOCK, 50mm', '[80141505-TS-093] PADLOCK, 50mm', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'piece', 10, 150, NULL, 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PADLOCK, 50mm' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAINT', '[80141505-TS-021] PAINT', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'gallon', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAINT' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, COLORED, A4', '[80141505-TS-022] PAPER, COLORED, A4', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 8, 'pack', 10, 250, NULL, 'expendable_supply', NULL, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, COLORED, A4' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, LAID', '[80141505-TS-094] PAPER, LAID', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 14, 'pack', 10, 300, NULL, 'expendable_supply', NULL, 5, 0, 0, 2, 0, 0, 2, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, LAID' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PAPER, MANILA', '[80141505-TS-031] PAPER, MANILA', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 270, 'pack', 10, 25, NULL, 'expendable_supply', NULL, 10, 0, 150, 50, 0, 0, 50, 0, 0, 10, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PAPER, MANILA' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PARACETAMOL', '[80141505-TS-041] PARACETAMOL', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 2, 'pack', 10, 150, NULL, 'expendable_supply', NULL, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PARACETAMOL' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PHOTO PAPER, MATTE', '[80141505-TS-006] PHOTO PAPER, MATTE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PHOTO PAPER, MATTE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PHOTO PAPER, SATIN', '[80141505-TS-095] PHOTO PAPER, SATIN', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PHOTO PAPER, SATIN' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PLASTIC ENVELOPE', '[80141505-TS-038] PLASTIC ENVELOPE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PLASTIC ENVELOPE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PLASTIC FASTENER', '[80141505-TS-017] PLASTIC FASTENER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 20, 'box', 10, 50, NULL, 'expendable_supply', NULL, 5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PLASTIC FASTENER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'POVIDONE IODINE', '[80141505-TS-045] POVIDONE IODINE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'bottle', 10, 100, NULL, 'expendable_supply', NULL, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'POVIDONE IODINE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PROFESSIONAL WIRELESS HEADSET', '[80141505-TS-096] PROFESSIONAL WIRELESS HEADSET', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PROFESSIONAL WIRELESS HEADSET' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'PUSH PIN', '[80141505-TS-024] PUSH PIN', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'pack', 10, 20, NULL, 'expendable_supply', NULL, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'PUSH PIN' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SCHOOL CHAIR', '[80141505-TS-097] SCHOOL CHAIR', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SCHOOL CHAIR' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'SMART TELEVISION', '[80141505-TS-012] SMART TELEVISION', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 2, 'unit', 10, 45000, NULL, 'expendable_supply', NULL, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'SMART TELEVISION' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STEEL FILING CABINET', '[80141505-TS-018] STEEL FILING CABINET', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STEEL FILING CABINET' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STEEL RACK', '[80141505-TS-048] STEEL RACK', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 4, 'set', 10, 12000, NULL, 'expendable_supply', NULL, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STEEL RACK' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STICKER PAPER, MATTE', '[80141505-TS-004] STICKER PAPER, MATTE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 30, 'pack', 10, 50, NULL, 'expendable_supply', NULL, 10, 0, 0, 5, 0, 0, 5, 0, 0, 10, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STICKER PAPER, MATTE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'STORAGE BOX, FOR LEGAL SIZE', '[80141505-TS-037] STORAGE BOX, FOR LEGAL SIZE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'STORAGE BOX, FOR LEGAL SIZE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'TABLET COMPUTER', '[80141505-TS-098] TABLET COMPUTER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'TABLET COMPUTER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'UNINTERRUPTIBLE POWER SUPPLY, TOWER TYPE, 650VA', '[80141505-TS-010] UNINTERRUPTIBLE POWER SUPPLY, TOWER TYPE, 650VA', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'UNINTERRUPTIBLE POWER SUPPLY, TOWER TYPE, 650VA' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'VELLUM BOARD PAPER', '[80141505-TS-019] VELLUM BOARD PAPER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'pack', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'VELLUM BOARD PAPER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'VIDEO CONFERENCING CAMERA', '[80141505-TS-099] VIDEO CONFERENCING CAMERA', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'VIDEO CONFERENCING CAMERA' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WATER DISPENSER', '[80141505-TS-040] WATER DISPENSER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WATER DISPENSER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WATER FILTER/PURIFIER FOR FAUCET', '[80141505-TS-106] WATER FILTER/PURIFIER FOR FAUCET', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'piece', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WATER FILTER/PURIFIER FOR FAUCET' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WHITEBOARD', '[80141505-TS-013] WHITEBOARD', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 2, 'piece', 10, 5000, NULL, 'expendable_supply', NULL, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WHITEBOARD' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WIFI EXTENDER', '[80141505-TS-100] WIFI EXTENDER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WIFI EXTENDER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WIRELESS MICROPHONE', '[80141505-TS-101] WIRELESS MICROPHONE', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WIRELESS MICROPHONE' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

WITH ins AS (
  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
    SELECT 'WIRELESS PRESENTER', '[80141505-TS-102] WIRELESS PRESENTER', (SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'), 'supply', 0, 'unit', 10, 0, NULL, 'expendable_supply', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'WIRELESS PRESENTER' AND barcode_value IS NULL)
    RETURNING id
)
UPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;

ALTER TABLE items ENABLE TRIGGER classify_inventory_item_before_write;
COMMIT;
