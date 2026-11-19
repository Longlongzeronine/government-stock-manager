# User Roles and Form Access

Self-service signup receives `Regular User` role and `Casual` employment status.
An administrator can assign multiple roles and change employment status in
Users & Roles. Every user must keep at least one role.

Semi-expendable RIS and PPE RIS require both the `Permanent Employee` role and
`Permanent` employment status. Other permissions are the union of assigned
roles and the editable role/form matrix.

Apply Supabase migrations in order before using these controls. The form access
matrix and role change audit are managed from Users & Roles.
