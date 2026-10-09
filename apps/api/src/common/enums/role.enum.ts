export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  MEMBER = 'MEMBER',
}

export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.MODERATOR];
export const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.MODERATOR,
  Role.TEACHER,
];
