import type { IUser } from "../../types/IUser";
import type { ICategoria } from "../../types/ICategoria";
import { renderNavBarUserName } from "../../utils/navBarName";

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");

const rawUser = localStorage.getItem("userData");

if (!rawUser) {
    window.location.href = "/src/pages/auth/login/login.html";
    throw new Error();
}

let userData: IUser;
try {
    userData = JSON.parse(rawUser) as IUser;
} catch {
    localStorage.removeItem("userData");
    window.location.href = "/src/pages/auth/login/login.html";
    throw new Error();
}

if (userData.rol !== "ADMIN") {
    window.location.href = "/index.html";
    throw new Error();
}

if (roleLabel) {
    roleLabel.textContent = "Admin";
}

renderNavBarUserName(userNameContainer);

logoutButton?.addEventListener("click", () => {
    localStorage.removeItem("userData");
    sessionStorage.clear();
    window.location.href = "/src/pages/auth/login/login.html";
});

const CATEGORY_STORAGE_KEY = "adminCategories";

const categoryForm = document.getElementById("category-form") as HTMLFormElement | null;
const toggleFormButton = document.getElementById("toggle-category-form") as HTMLButtonElement | null;
const cancelFormButton = document.getElementById("cancel-category-form") as HTMLButtonElement | null;
const nameInput = document.getElementById("category-name") as HTMLInputElement | null;
const descriptionInput = document.getElementById("category-description") as HTMLTextAreaElement | null;
const imageInput = document.getElementById("category-image") as HTMLInputElement | null;
const tableWrapper = document.getElementById("category-table-wrapper") as HTMLDivElement | null;
const tableBody = document.getElementById("category-table-body") as HTMLTableSectionElement | null;
const emptyState = document.getElementById("category-empty-state") as HTMLParagraphElement | null;
const formError = document.getElementById("category-form-error") as HTMLParagraphElement | null;
const formTitle = document.getElementById("category-form-title") as HTMLHeadingElement | null;
const submitButton = categoryForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;

type FormMode = "create" | "edit";
let formMode: FormMode = "create";
let editingCategoryId: number | null = null;
let categories: ICategoria[] = [];
let nextCategoryId = 1;

const showFormError = (message: string) => {
    if (!formError) return;
    formError.textContent = message;
    formError.classList.remove("hidden");
};

const clearFormError = () => {
    if (!formError) return;
    formError.textContent = "";
    formError.classList.add("hidden");
};

// Actualiza el texto del botón que muestra u oculta el formulario de categorías.
// Si el formulario está oculto (tiene el atributo "hidden"), el botón mostrará "Nueva categoría".
// Si el formulario está visible:
//   - mostrará "Cerrar edición" cuando el modo actual sea "edit".
//   - mostrará "Ocultar formulario" en cualquier otro caso.
const updateToggleLabel = () => {
    if (!toggleFormButton || !categoryForm) return;
    const isHidden = categoryForm.hasAttribute("hidden");
    if (isHidden) {
        toggleFormButton.textContent = "Nueva categoría";
        return;
    }
    toggleFormButton.textContent = formMode === "edit" ? "Cerrar edición" : "Ocultar formulario";
};


// CONTINUAR DESDE ACA

const setFormMode = (mode: FormMode) => {
    formMode = mode;

    if (submitButton) {
        submitButton.textContent = mode === "edit" ? "Actualizar" : "Guardar";
    }

    if (cancelFormButton) {
        cancelFormButton.textContent = mode === "edit" ? "Cancelar edición" : "Cancelar";
    }

    if (formTitle) {
        formTitle.textContent = mode === "edit" ? "Editar categoría" : "Nueva categoría";
    }

    updateToggleLabel();
};

const generateCategoryId = () => nextCategoryId++;

const isValidUrl = (value: string) => {
    if (!value) return false;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

const loadCategories = (): ICategoria[] => {
    const rawCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!rawCategories) return [];

    try {
        const parsed = JSON.parse(rawCategories);
        if (!Array.isArray(parsed)) return [];

        const normalized: ICategoria[] = [];
        for (const item of parsed) {
            if (!item || typeof item !== "object") continue;
            const record = item as Record<string, unknown>;

            const idRaw = record.id;
            const nombre = record.nombre;
            const descripcion = record.descripcion;
            const imagenUrl = record.imagenUrl;

            const id =
                typeof idRaw === "number"
                    ? idRaw
                    : (() => {
                          const idText = String(idRaw ?? "").trim();
                          if (!idText) return Number.NaN;
                          const matches = idText.match(/\d+/g);
                          if (!matches || !matches.length) return Number.NaN;
                          return Number.parseInt(matches[matches.length - 1], 10);
                      })();

            if (
                !Number.isFinite(id) ||
                id < 1 ||
                typeof nombre !== "string" ||
                typeof descripcion !== "string"
            ) {
                continue;
            }

            normalized.push({
                id,
                nombre,
                descripcion,
                imagenUrl:
                    typeof imagenUrl === "string" && imagenUrl.trim().length > 0
                        ? imagenUrl.trim()
                        : undefined
            });
        }

        return normalized.sort((a, b) => b.id - a.id);
    } catch {
        localStorage.removeItem(CATEGORY_STORAGE_KEY);
        return [];
    }
};

const saveCategories = (items: ICategoria[]) => {
    try {
        localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Ignoramos fallos de almacenamiento para no interrumpir la experiencia.
    }
};

const createCategoryRow = (category: ICategoria) => {
    const row = document.createElement("tr");
    row.className = "transition hover:bg-primary/5";

    const idCell = document.createElement("td");
    idCell.className = "px-4 py-3 align-top break-all font-mono text-xs text-dark/70";
    idCell.textContent = String(category.id);

    const imageCell = document.createElement("td");
    imageCell.className = "px-4 py-3 align-top";

    if (category.imagenUrl) {
        const img = document.createElement("img");
        img.src = category.imagenUrl;
        img.alt = `Imagen de la categoría ${category.nombre}`;
        img.className = "h-14 w-14 rounded-xl object-cover shadow-sm";
        img.loading = "lazy";
        img.decoding = "async";
        imageCell.appendChild(img);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className =
            "flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary";
        placeholder.textContent = category.nombre.charAt(0).toUpperCase();
        imageCell.appendChild(placeholder);
    }

    const nameCell = document.createElement("td");
    nameCell.className = "px-4 py-3 align-top";
    const nameWrapper = document.createElement("div");
    nameWrapper.className = "flex flex-col gap-1";

    const title = document.createElement("span");
    title.className = "text-sm font-semibold text-dark";
    title.textContent = category.nombre;

    nameWrapper.appendChild(title);

    nameCell.appendChild(nameWrapper);

    const descriptionCell = document.createElement("td");
    descriptionCell.className = "px-4 py-3 align-top text-sm text-dark/70";
    descriptionCell.textContent = category.descripcion;

    const actionsCell = document.createElement("td");
    actionsCell.className = "px-4 py-3 align-top";

    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "flex flex-wrap items-center gap-2";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = String(category.id);
    editButton.className =
        "inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10";
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = String(category.id);
    deleteButton.className =
        "inline-flex items-center justify-center rounded-lg border border-danger px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10";
    deleteButton.textContent = "Borrar";

    actionsWrapper.append(editButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);

    row.append(idCell, imageCell, nameCell, descriptionCell, actionsCell);
    return row;
};

const renderCategories = () => {
    if (!tableWrapper || !tableBody) return;

    tableBody.innerHTML = "";

    if (!categories.length) {
        tableWrapper.setAttribute("hidden", "");
        emptyState?.classList.remove("hidden");
        return;
    }

    tableWrapper.removeAttribute("hidden");
    emptyState?.classList.add("hidden");

    categories.forEach((category) => {
        tableBody.appendChild(createCategoryRow(category));
    });
};

const openForm = (options?: { focus?: boolean }) => {
    if (!categoryForm) return;
    categoryForm.removeAttribute("hidden");
    updateToggleLabel();
    clearFormError();
    if (options?.focus !== false) {
        nameInput?.focus();
    }
};

const closeForm = (reset = true) => {
    if (!categoryForm) return;
    categoryForm.setAttribute("hidden", "");
    editingCategoryId = null;
    setFormMode("create");
    clearFormError();
    if (reset) {
        categoryForm.reset();
    }
    updateToggleLabel();
};

setFormMode("create");

toggleFormButton?.addEventListener("click", () => {
    if (!categoryForm) return;
    const isHidden = categoryForm.hasAttribute("hidden");
    if (isHidden) {
        openForm();
    } else {
        closeForm();
    }
});

cancelFormButton?.addEventListener("click", () => {
    closeForm();
});

categoryForm?.addEventListener("input", () => {
    clearFormError();
});

categoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!nameInput || !descriptionInput) return;

    const nombre = nameInput.value.trim();
    const descripcion = descriptionInput.value.trim();
    const imagenUrl = imageInput?.value.trim() ?? "";

    if (!nombre || !descripcion) {
        showFormError("Completá el nombre y la descripción para continuar.");
        return;
    }

    if (imagenUrl && !isValidUrl(imagenUrl)) {
        showFormError("La URL de la imagen no es válida.");
        return;
    }

    const normalizedImage = imagenUrl || undefined;

    if (formMode === "edit" && editingCategoryId) {
        const existing = categories.find((item) => item.id === editingCategoryId);

        if (!existing) {
            closeForm();
            return;
        }

        const updatedCategory: ICategoria = {
            ...existing,
            nombre,
            descripcion,
            imagenUrl: normalizedImage
        };

        categories = categories.map((item) =>
            item.id === editingCategoryId ? updatedCategory : item
        );

        saveCategories(categories);
        renderCategories();
        closeForm();
        return;
    }

    const newCategory: ICategoria = {
        id: generateCategoryId(),
        nombre,
        descripcion,
        imagenUrl: normalizedImage
    };

    categories = [newCategory, ...categories];
    saveCategories(categories);
    renderCategories();
    closeForm();
});

tableBody?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const actionButton = target.closest<HTMLButtonElement>("button[data-action]");

    if (!actionButton) return;

    const { action, id } = actionButton.dataset;
    if (!action || !id) return;

    const categoryId = Number.parseInt(id, 10);
    if (Number.isNaN(categoryId) || categoryId < 1) return;

    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;

    if (action === "edit") {
        editingCategoryId = categoryId;
        setFormMode("edit");

        if (nameInput) {
            nameInput.value = category.nombre;
        }
        if (descriptionInput) {
            descriptionInput.value = category.descripcion;
        }
        if (imageInput) {
            imageInput.value = category.imagenUrl ?? "";
        }

        openForm();
        return;
    }

    if (action === "delete") {
        const confirmed = window.confirm(
            `¿Seguro que querés borrar la categoría “${category.nombre}”?`
        );
        if (!confirmed) return;

        categories = categories.filter((item) => item.id !== categoryId);
        saveCategories(categories);
        renderCategories();

        if (editingCategoryId === categoryId) {
            closeForm();
        }

    }
});

categories = loadCategories();
const maxExistingId = categories.reduce((max, item) => Math.max(max, item.id), 0);
nextCategoryId = Math.max(maxExistingId + 1, 1);
renderCategories();
