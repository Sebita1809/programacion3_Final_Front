import type { IUser } from "../types/IUser";
import { getStoredUser } from "./auth";

const USER_HOME_URL = "/index.html";
const ADMIN_HOME_URL = "/src/admin/adminHome/adminHome.html";

export const redirect = (url: string) => {
    window.location.href = url;
};

const hasAdminRole = (user: unknown): boolean => {
    if (!user || typeof user !== "object") return false;
    const role = (user as Partial<IUser>).rol;
    return role === "ADMIN";
};

export const navigateToHomeByRole = (user: unknown) => {
    if (hasAdminRole(user)) {
        redirect(ADMIN_HOME_URL);
        return;
    }
    redirect(USER_HOME_URL);
};

export const navigateByStoredSession = () => {
    const hadSession = Boolean(localStorage.getItem("userData"));
    const storedUser = getStoredUser();
    if (!storedUser) {
        if (hadSession) {
            redirect(USER_HOME_URL);
        }
        return;
    }

    navigateToHomeByRole(storedUser);
    console.info("Sesión existente detectada. Redirigiendo automáticamente.");
};

/*
export const navigateByStoredSession = () => {
    const storedUserRaw = localStorage.getItem("userData");
    if (!storedUserRaw) return;

    try {
        const storedUser = JSON.parse(storedUserRaw) as unknown;
        navigateToHomeByRole(storedUser);
        console.info("Sesión existente detectada. Redirigiendo automáticamente.");
    } catch (error) {
        console.warn("No se pudo restaurar la sesión almacenada:", error);
        redirect(USER_HOME_URL);
    }
};
*/
