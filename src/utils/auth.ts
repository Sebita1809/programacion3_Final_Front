import type { IUser } from "../types/IUser";

const USER_STORAGE_KEY = "userData";
const LOGIN_PAGE_URL = "/src/pages/auth/login/login.html";
const HOME_PAGE_URL = "/index.html";

const redirectWithError = (url: string, message: string): never => {
    window.location.href = url;
    throw new Error(message);
};

export const getStoredUser = (): IUser | null => {
    const userRaw = localStorage.getItem(USER_STORAGE_KEY);
    if (!userRaw) return null;

    try {
        return JSON.parse(userRaw) as IUser;
    } catch (error) {
        console.error("No se pudo parsear la sesión guardada:", error);
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }
};

export const getStoredUserOrRedirect = (): IUser => {
    const user = getStoredUser();

    if (!user) {
        return redirectWithError(LOGIN_PAGE_URL, "Intento de acceder al panel sin sesión.");
    }
    return user;
};

export const ensureAdminRole = (user: IUser): IUser => {
    if (user.rol !== "ADMIN") {
        return redirectWithError(
            HOME_PAGE_URL,
            "Acceso denegado: el usuario no es administrador."
        );
    }

    return user;
};

export const requireAdminSession = (): IUser => ensureAdminRole(getStoredUserOrRedirect());

export const clearStoredSession = (): void => {
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.clear();
};

export const registerLogoutHandler = (button: HTMLElement | null): void => {
    if (!button) return;

    button.addEventListener("click", () => {
        clearStoredSession();
        window.location.href = LOGIN_PAGE_URL;
    });
};
