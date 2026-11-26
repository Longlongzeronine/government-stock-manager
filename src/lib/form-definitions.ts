export type FormSection = "Supplies" | "Semi-Expendable Property" | "PPE";

export type RoleCode =
  | "admin"
  | "super_admin"
  | "regular_user"
  | "permanent_employee"
  | "supply_officer"
  | "inspection_officer"
  | "financial_analyst";

export const ROLE_CODES: RoleCode[] = [
  "super_admin",
  "admin",
  "regular_user",
  "permanent_employee",
  "supply_officer",
  "inspection_officer",
  "financial_analyst",
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  regular_user: "Regular User",
  permanent_employee: "Permanent Employee",
  supply_officer: "Supply Officer",
  inspection_officer: "Inspection Officer",
  financial_analyst: "Financial Analyst",
};

export interface FormDefinition {
  formKey: string;
  section: FormSection;
  label: string;
  sortOrder: number;
}

/**
 * Single source of truth for all form definitions used by both the Forms Flow
 * tabs and the role/permission matrix. Keeping both driven by this list
 * prevents them from going out of sync when forms are added or removed.
 */
export const FORM_DEFINITIONS: FormDefinition[] = [
  // Supplies & Materials
  { formKey: "supplies_iar", section: "Supplies", label: "IAR", sortOrder: 10 },
  { formKey: "supplies_stock_card", section: "Supplies", label: "Stock Card", sortOrder: 12 },
  { formKey: "supplies_ris", section: "Supplies", label: "RIS", sortOrder: 14 },
  { formKey: "supplies_rsmi", section: "Supplies", label: "RSMI", sortOrder: 16 },
  { formKey: "supplies_rpci", section: "Supplies", label: "RPCI", sortOrder: 18 },

  // Semi-Expendable Property
  { formKey: "semi_iar", section: "Semi-Expendable Property", label: "IAR", sortOrder: 50 },
  { formKey: "semi_splc", section: "Semi-Expendable Property", label: "SPLC", sortOrder: 52 },
  { formKey: "semi_spc", section: "Semi-Expendable Property", label: "SPC", sortOrder: 54 },
  { formKey: "semi_ris", section: "Semi-Expendable Property", label: "RIS", sortOrder: 56 },
  { formKey: "semi_ics", section: "Semi-Expendable Property", label: "ICS", sortOrder: 58 },
  { formKey: "semi_itr", section: "Semi-Expendable Property", label: "ITR", sortOrder: 60 },
  { formKey: "semi_rspi", section: "Semi-Expendable Property", label: "RSPI", sortOrder: 80 },
  { formKey: "semi_regspi", section: "Semi-Expendable Property", label: "RegSPI", sortOrder: 82 },
  { formKey: "semi_iirup", section: "Semi-Expendable Property", label: "IIRUP", sortOrder: 84 },
  { formKey: "semi_rlsddp", section: "Semi-Expendable Property", label: "RLSDDP", sortOrder: 86 },
  { formKey: "semi_rrpe", section: "Semi-Expendable Property", label: "RRPE", sortOrder: 88 },
  { formKey: "semi_rpcsp", section: "Semi-Expendable Property", label: "RPCSP", sortOrder: 90 },

  // Property, Plant & Equipment
  { formKey: "ppe_iar", section: "PPE", label: "IAR", sortOrder: 100 },
  { formKey: "ppe_ppelc", section: "PPE", label: "PPELC", sortOrder: 102 },
  { formKey: "ppe_pc", section: "PPE", label: "PC", sortOrder: 104 },
  { formKey: "ppe_ris", section: "PPE", label: "RIS", sortOrder: 106 },
  { formKey: "ppe_par", section: "PPE", label: "PAR", sortOrder: 108 },
  { formKey: "ppe_ptr", section: "PPE", label: "PTR", sortOrder: 110 },
  { formKey: "ppe_rpcppe", section: "PPE", label: "RPCPPE", sortOrder: 112 },
  { formKey: "ppe_iirup", section: "PPE", label: "IIRUP", sortOrder: 114 },
  { formKey: "ppe_rlsddp", section: "PPE", label: "RLSDDP", sortOrder: 116 },
  { formKey: "ppe_rrpe", section: "PPE", label: "RRPE", sortOrder: 118 },
];

export const FORM_ACCESS_KEYS = FORM_DEFINITIONS.map((f) => f.formKey);

export const FORMS_BY_SECTION: Record<FormSection, FormDefinition[]> = {
  Supplies: FORM_DEFINITIONS.filter((f) => f.section === "Supplies").sort((a, b) => a.sortOrder - b.sortOrder),
  "Semi-Expendable Property": FORM_DEFINITIONS
    .filter((f) => f.section === "Semi-Expendable Property")
    .sort((a, b) => a.sortOrder - b.sortOrder),
  PPE: FORM_DEFINITIONS.filter((f) => f.section === "PPE").sort((a, b) => a.sortOrder - b.sortOrder),
};