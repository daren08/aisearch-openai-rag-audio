// Utility to extract role from JWT access token
import { jwtDecode } from "jwt-decode";

export function getRoleFromToken(token: string): string | undefined {
    try {
        const decoded: any = jwtDecode(token);
        // Common claim names for roles: 'roles', 'role', 'appRole', 'groups', 'jobTitle', 'position', etc.
        // Adjust as needed for your token structure
        if (decoded.roles && Array.isArray(decoded.roles)) {
            return decoded.roles[0];
        }
        if (decoded.role) {
            return decoded.role;
        }
        if (decoded.jobTitle) {
            return decoded.jobTitle;
        }
        if (decoded.position) {
            return decoded.position;
        }
        return undefined;
    } catch (e) {
        return undefined;
    }
}
