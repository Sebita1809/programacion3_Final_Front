import type { IUser } from "../../types/IUser";

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");

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

//debería ser una funcion ya que se utiliza varias veces en el codigo
logoutButton?.addEventListener("click", () => {
    localStorage.removeItem("userData");
    sessionStorage.clear();
    window.location.href = "/src/pages/auth/login/login.html";
});
