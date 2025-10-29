import type { IUser } from "../types/IUser";

const USER_STORAGE_KEY = "userData";

const getStoredUserName = (): string => {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) return "";

    try {
        const { nombre = "", apellido = "" } = JSON.parse(rawUser) as Partial<IUser>;

        // Función auxiliar para capitalizar
        // Es para que el nombre y apellido se muestren con la primera letra mayuscula y el resto en minuscula
        const capitalize = (text: string) =>
            text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";

        // Aplica capitalización
        const fullName = `${capitalize(nombre)} ${capitalize(apellido)}`.trim();

        return fullName;
    } catch (error) {
        console.warn("No se pudo recuperar el usuario almacenado:", error);
        localStorage.removeItem(USER_STORAGE_KEY);
        return "";
    }
};


export const createNavBarUserDiv = (elementId = "navbar-user-name"): HTMLDivElement => {
    const userDiv = document.createElement("div");
    userDiv.id = elementId;
    userDiv.className = "text-sm font-medium text-dark/80";
    userDiv.textContent = getStoredUserName();
    return userDiv;
};

export const renderNavBarUserName = (
    container: HTMLElement | null,
    elementId = "navbar-user-name"
): HTMLDivElement | null => {
    if (!container) {
        console.warn("Contenedor del nombre de usuario no encontrado.");
        return null;
    }

    const userDiv = createNavBarUserDiv(elementId);
    const existing = container.querySelector<HTMLDivElement>(`#${elementId}`);

    if (existing) {
        existing.replaceWith(userDiv);
    } else {
        container.appendChild(userDiv);
    }

    return userDiv;
};
