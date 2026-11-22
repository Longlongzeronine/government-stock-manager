/**
 * Single source of truth for how an item's inventory classification is derived
 * from its type and acquisition cost.
 *
 * The Inventory page owns the base item data; the Forms Flow page (Supplies /
 * Semi-Expendable / PPE tabs) reads the same `items` rows and filters them by
 * `inventory_classification`. Keeping this derivation in one place guarantees
 * both pages agree, and mirrors the `auto_classify_item` Postgres trigger used
 * by the local database.
 */

export type ItemType = "supply" | "material";

export type InventoryClassification =
  | "expendable_supply"
  | "semi_expendable_property"
  | "ppe";

export type SemiExpendableTier = "low_value" | "high_value";

/** Materials at or above this cost are capitalised as PPE. */
export const PPE_CAPITALIZATION_THRESHOLD = 50000;
/** Materials at or above this cost fall in the high-value semi-expendable tier. */
export const SEMI_EXPENDABLE_HIGH_VALUE_THRESHOLD = 15000;

export type ItemClassification = {
  item_type: ItemType;
  inventory_classification: InventoryClassification;
  semi_expendable_tier: SemiExpendableTier | null;
};

export function classifyInventoryItem(
  itemType: ItemType | string | null | undefined,
  acquisitionCost: number | string | null | undefined,
): ItemClassification {
  const type: ItemType = itemType === "material" ? "material" : "supply";
  const cost = Number(acquisitionCost) || 0;

  if (type === "supply") {
    return {
      item_type: "supply",
      inventory_classification: "expendable_supply",
      semi_expendable_tier: null,
    };
  }

  if (cost >= PPE_CAPITALIZATION_THRESHOLD) {
    return {
      item_type: "material",
      inventory_classification: "ppe",
      semi_expendable_tier: null,
    };
  }

  return {
    item_type: "material",
    inventory_classification: "semi_expendable_property",
    semi_expendable_tier:
      cost >= SEMI_EXPENDABLE_HIGH_VALUE_THRESHOLD ? "high_value" : "low_value",
  };
}

/** Human readable label used across the Inventory and Forms Flow pages. */
export function inventoryClassificationLabel(item: {
  inventory_classification?: string | null;
  semi_expendable_tier?: string | null;
}): string {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property") {
    return item.semi_expendable_tier === "high_value"
      ? "Semi-Exp. High"
      : "Semi-Exp. Low";
  }
  return "Expendable";
}
