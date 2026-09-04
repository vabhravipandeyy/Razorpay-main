from enum import Enum
from typing import Set, List


class Role(str, Enum):
    ADMIN = "admin"
    INSPECTOR = "inspector"


class Permission(str, Enum):
    # Inspector & Admin Permissions
    VIEW_DASHBOARD = "VIEW_DASHBOARD"
    ANALYZE_VEHICLE = "ANALYZE_VEHICLE"
    VIEW_SUSPICIOUS = "VIEW_SUSPICIOUS"
    USE_COPILOT = "USE_COPILOT"
    VIEW_RECOMMENDATIONS = "VIEW_RECOMMENDATIONS"

    # Admin-Only Permissions
    MANAGE_USERS = "MANAGE_USERS"
    CHANGE_USER_ROLES = "CHANGE_USER_ROLES"
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS"
    TRAIN_ML = "TRAIN_ML"
    MANAGE_KNOWLEDGE_BASE = "MANAGE_KNOWLEDGE_BASE"
    BATCH_SYNC = "BATCH_SYNC"
    VIEW_SYSTEM_HEALTH = "VIEW_SYSTEM_HEALTH"


ROLE_PERMISSIONS = {
    Role.ADMIN: {
        Permission.VIEW_DASHBOARD,
        Permission.ANALYZE_VEHICLE,
        Permission.VIEW_SUSPICIOUS,
        Permission.USE_COPILOT,
        Permission.VIEW_RECOMMENDATIONS,
        Permission.MANAGE_USERS,
        Permission.CHANGE_USER_ROLES,
        Permission.VIEW_AUDIT_LOGS,
        Permission.TRAIN_ML,
        Permission.MANAGE_KNOWLEDGE_BASE,
        Permission.BATCH_SYNC,
        Permission.VIEW_SYSTEM_HEALTH,
    },
    Role.INSPECTOR: {
        Permission.VIEW_DASHBOARD,
        Permission.ANALYZE_VEHICLE,
        Permission.VIEW_SUSPICIOUS,
        Permission.USE_COPILOT,
        Permission.VIEW_RECOMMENDATIONS,
    },
}


def get_permissions_for_role(role_name: str) -> Set[Permission]:
    role_enum = Role.ADMIN if str(role_name).lower() == "admin" else Role.INSPECTOR
    return ROLE_PERMISSIONS.get(role_enum, set())


def has_permission(role_name: str, permission: Permission) -> bool:
    perms = get_permissions_for_role(role_name)
    return permission in perms
