import type { IUser } from "../types/IUser";

const LOGIN_URL = "/src/pages/auth/login/login.html";
const ADMIN_HOME_URL = "/src/admin/adminHome/adminHome.html";

export const redirect = (url: string) => {
    window.location.href = url;
};

const clearSessionAndRedirect = () => {
    localStorage.removeItem("userData");
    sessionStorage.clear();
    redirect(LOGIN_URL);
};

const getStoredUser = (): IUser | null => {
    const raw = localStorage.getItem("userData");
    if (!raw) return null;

    try {
        return JSON.parse(raw) as IUser;
    } catch (error) {
        console.warn("No se pudo parsear el usuario almacenado:", error);
        localStorage.removeItem("userData");
        return null;
    }
};

const init = () => {
    const userData = getStoredUser();

    if (!userData) {
        redirect(LOGIN_URL);
        return;
    }

    if (userData.rol === "ADMIN") {
        redirect(ADMIN_HOME_URL);
        return;
    }

    const navbarRole = document.getElementById("navbar-role");
    if (navbarRole) {
        navbarRole.textContent = "Usuario";
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", clearSessionAndRedirect);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
