export const osNav = [
  ['dashboard', '/dashboard', 'Dashboard'],
  ['customers', '/customers', 'Customers'],
  ['students', '/students', 'Students'],
  ['venues', '/venues', 'Venues'],
  ['classes', '/classes', 'Classes'],
  ['packages', '/packages', 'Packages'],
  ['lessons', '/lessons', 'Schedule'],
  ['review', '/review', 'Review'],
  ['payroll', '/payroll', 'Payroll'],
  ['payments', '/payments', 'Payments'],
  ['expenses', '/expenses', 'Expenses'],
  ['import', '/import', 'Import'],
  ['cleanup', '/data-cleanup', 'Cleanup'],
  ['reports', '/reports', 'Reports'],
  ['settings', '/settings', 'Settings'],
];

export const coachHiddenNav = new Set(['payments', 'expenses', 'import', 'cleanup', 'settings', 'review']);

export const statusLabels = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  completed_pending_review: 'Pending Review',
  cancelled_pending_review: 'Pending Review',
  needs_edit: 'Needs Edit',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const statusTones = {
  active: 'green',
  scheduled: 'sky',
  rescheduled: 'amber',
  completed_pending_review: 'amber',
  cancelled_pending_review: 'amber',
  needs_edit: 'rose',
  approved: 'green',
  rejected: 'rose',
  archived: 'slate',
  pending: 'amber',
  paid: 'green',
  ready: 'sky',
  draft: 'slate',
  void: 'rose',
  expired: 'rose',
  completed: 'green',
  paused: 'amber',
};

export const packageValidityMonths = {
  single: 1,
  '4_lessons': 2,
  '6_lessons': 3,
  '8_lessons': 4,
  special: 0,
};

export const classTypes = ['1-1', '1-2', '1-3', '1-4', 'special'];
export const packageTypes = ['single', '4_lessons', '6_lessons', '8_lessons', 'special'];
export const paymentMethods = ['TNG', 'bank_transfer', 'DuitNow', 'cash', 'other'];
export const expenseCategories = ['coach_salary', 'pool_fee', 'advertising', 'equipment', 'transport', 'software', 'bank_charge', 'other'];
