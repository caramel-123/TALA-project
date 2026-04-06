import { FileText } from 'lucide-react';

export const reportTemplates = [
  { name: 'Regional Brief', scope: 'Region/Division', icon: FileText },
  { name: 'Division Summary', scope: 'Division', icon: FileText },
  { name: 'Intervention Plan', scope: 'Multi-region', icon: FileText },
  { name: 'Data Quality Report', scope: 'National', icon: FileText },
  { name: 'National Overview', scope: 'National', icon: FileText },
];

export const generatedReports = [
  {
    name: 'Region XII SOCCSKSARGEN Planning Brief',
    type: 'Regional Brief',
    scope: 'Region XII',
    date: 'April 3, 2026',
    generatedBy: 'Maria Santos',
  },
  {
    name: 'Q1 2026 National Overview',
    type: 'National Overview',
    scope: 'National',
    date: 'March 31, 2026',
    generatedBy: 'Juan dela Cruz',
  },
  {
    name: 'BARMM Intervention Planning Document',
    type: 'Intervention Plan',
    scope: 'BARMM',
    date: 'March 28, 2026',
    generatedBy: 'Maria Santos',
  },
  {
    name: 'Data Quality Assessment - Calabarzon',
    type: 'Data Quality Report',
    scope: 'Region IV-A',
    date: 'March 25, 2026',
    generatedBy: 'Pedro Reyes',
  },
];

export const settingsUsers = [
  { name: 'Maria Santos', email: 'maria.santos@deped.gov.ph', role: 'National Admin', status: 'Active', lastLogin: 'April 5, 2026' },
  { name: 'Juan dela Cruz', email: 'juan.delacruz@deped.gov.ph', role: 'Regional Implementer', status: 'Active', lastLogin: 'April 4, 2026' },
  { name: 'Pedro Reyes', email: 'pedro.reyes@deped.gov.ph', role: 'Data Steward', status: 'Active', lastLogin: 'April 3, 2026' },
  { name: 'Ana Garcia', email: 'ana.garcia@deped.gov.ph', role: 'Read-Only Viewer', status: 'Active', lastLogin: 'March 30, 2026' },
];

export const settingsRoles = [
  {
    name: 'National Admin',
    permissions: ['Full system access', 'User management', 'Data governance', 'All modules'],
    users: 2,
  },
  {
    name: 'Regional Implementer',
    permissions: ['Diagnose module', 'Advise module', 'Reports', 'Regional data only'],
    users: 8,
  },
  {
    name: 'Data Steward',
    permissions: ['Data Manager', 'Quality reports', 'Validation', 'Upload data'],
    users: 5,
  },
  {
    name: 'Read-Only Viewer',
    permissions: ['View dashboards', 'View reports', 'No edit access'],
    users: 12,
  },
];

export const settingsAuditLog = [
  { user: 'Maria Santos', action: 'Approved intervention plan', module: 'Advise', timestamp: 'April 5, 2026 10:30 AM' },
  { user: 'Pedro Reyes', action: 'Uploaded teacher dataset', module: 'Data Manager', timestamp: 'April 5, 2026 09:15 AM' },
  { user: 'Juan dela Cruz', action: 'Generated regional report', module: 'Reports', timestamp: 'April 4, 2026 04:20 PM' },
  { user: 'Maria Santos', action: 'Modified user permissions', module: 'Settings', timestamp: 'April 4, 2026 02:00 PM' },
];
