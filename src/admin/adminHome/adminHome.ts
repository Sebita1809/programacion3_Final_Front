import type { IUser } from "../../types/IUser";
import { renderNavBarUserName } from "../../utils/navBarName";
import { registerLogoutHandler, requireAdminSession } from "../../utils/auth";

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");

const adminUser: IUser = requireAdminSession();

if (roleLabel) {
    roleLabel.textContent = adminUser.rol === "ADMIN" ? "Admin" : adminUser.rol ?? "";
}

renderNavBarUserName(userNameContainer);

registerLogoutHandler(logoutButton);

/*
const userRaw = localStorage.getItem("userData");

if (!userRaw) {
    window.location.href = "/src/pages/auth/login/login.html";
    throw new Error("Intento de acceder al panel sin sesión.");
}

let userData: IUser;
try {
    userData = JSON.parse(userRaw) as IUser;
} catch (error) {
    console.error("No se pudo parsear la sesión guardada:", error);
    localStorage.removeItem("userData");
    window.location.href = "/src/pages/auth/login/login.html";
    throw error;
}

if (userData.rol !== "ADMIN") {
    window.location.href = "/index.html";
    throw new Error("Acceso denegado: el usuario no es administrador.");
}

if (roleLabel) {
    roleLabel.textContent = "Admin";
}

renderNavBarUserName(userNameContainer);

//debería ser una funcion ya que se utiliza varias veces en el codigo
logoutButton?.addEventListener("click", () => {
    localStorage.removeItem("userData");
    sessionStorage.clear();
    window.location.href = "/src/pages/auth/login/login.html";
});
*/
