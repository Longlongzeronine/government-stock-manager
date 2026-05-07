# Signup Role

Signup creates one role automatically:

- `viewer`

Frontend sends `viewer` to Supabase Auth metadata as `requested_role`.

Admin can upgrade users from Users & Roles.

Users & Roles page only assigns:

- `admin`
- `viewer`
