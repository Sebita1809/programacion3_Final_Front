import type { IUser } from "../types/IUser";
import { renderNavBarUserName } from "../utils/navBarName";

const LOGIN_URL = "/src/pages/auth/login/login.html";
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

    const navbarRole = document.getElementById("navbar-role");
    const userNameContainer = document.getElementById("navbar-user-name-container");
    if (navbarRole) {
        navbarRole.textContent = userData.rol === "ADMIN" ? "Admin" : "Usuario";
    }

    renderNavBarUserName(userNameContainer);

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
