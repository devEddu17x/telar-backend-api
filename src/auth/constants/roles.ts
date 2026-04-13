export enum ROLES {
  OWNER = 'owner',
  ADMIN = 'admin',
  SELLER = 'seller',
}

export enum CREATABLE_ROLES {
  ADMIN = 'admin',
  SELLER = 'seller',
}

// enum ACTION {
//   CREATE = 'create',
//   READ = 'read',
//   UPDATE = 'update',
//   DELETE = 'delete',
// }

// enum RESOURCE {
//   CLOTHES = 'clothes',
//   EMPLOYEES = 'employees',
//   SELF = 'self',
// }

// // format: ACTION:RESOURCE
// export const ROLE_PERMISSIONS: Record<string, string[]> = {
//   [ROLES.OWNER]: [`${ACTION.READ}:${RESOURCE.CLOTHES}`],
//   [ROLES.ADMIN]: [
//     `${ACTION.CREATE}:${RESOURCE.CLOTHES}`,
//     `${ACTION.READ}:${RESOURCE.CLOTHES}`,
//   ],
//   [ROLES.SELLER]: [`${ACTION.READ}:${RESOURCE.CLOTHES}`],
// };
