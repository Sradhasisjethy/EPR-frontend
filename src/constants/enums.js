// Mirrors backend/src/utils/constants.js — kept in sync manually since the two
// projects don't share a package.
export const SystemRoles = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  TENANT_OWNER: 'TENANT_OWNER',
  ORG_ADMIN: 'ORG_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

export const WebPermissions = {
  EMPLOYEE_READ: 'EMPLOYEE_READ',
  EMPLOYEE_WRITE: 'EMPLOYEE_WRITE',
  ORG_READ: 'ORG_READ',
  ORG_WRITE: 'ORG_WRITE',
  ROLE_READ: 'ROLE_READ',
  ROLE_WRITE: 'ROLE_WRITE',
  SETTINGS_READ: 'SETTINGS_READ',
  SETTINGS_WRITE: 'SETTINGS_WRITE',
};

export const EmployeeType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  INTERN: 'INTERN',
};

export const EmployeeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ONBOARDING: 'ONBOARDING',
  TERMINATED: 'TERMINATED',
};
