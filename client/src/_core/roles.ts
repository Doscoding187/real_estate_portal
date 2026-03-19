export const normalizeRole = (value?: string | null) => {
  if (value === 'user') return 'visitor';
  if (value === 'admin') return 'super_admin';
  return value ?? null;
};

export const isSuperAdminRole = (value?: string | null) => normalizeRole(value) === 'super_admin';

