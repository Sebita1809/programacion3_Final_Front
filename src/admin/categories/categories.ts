import { renderNavBarUserName } from "../../utils/navBarName";
import type { CategoryRowData } from "../../types/adminCategories";
import {
    registerLogoutHandler,
    requireAdminSession
} from "../../utils/auth";

const CATEGORY_API_URL = "http://localhost:8080/category/";
const CATEGORY_API_URL_CREATE = "http://localhost:8080/category/create";

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");

const adminUser = requireAdminSession();

if (roleLabel) {
    roleLabel.textContent = adminUser.rol === "ADMIN" ? "Admin" : adminUser.rol ?? "";
}

renderNavBarUserName(userNameContainer);

registerLogoutHandler(logoutButton);

const newCategoryButton = document.getElementById("toggle-category-form") as HTMLButtonElement | null;
const categoryModal = document.getElementById("category-modal") as HTMLDivElement | null;
const modalContent = document.getElementById("category-modal-content") as HTMLDivElement | null;
const categoryForm = document.getElementById("category-form") as HTMLFormElement | null;
const nameInput = document.getElementById("category-name") as HTMLInputElement | null;
const categoryTableBody = document.getElementById("category-table-body") as HTMLTableSectionElement | null;
const descriptionInput = document.getElementById("category-description") as HTMLTextAreaElement | null;
const imageInput = document.getElementById("category-image") as HTMLInputElement | null;
const modalTitle = document.getElementById("category-modal-title") as HTMLHeadingElement | null;
const submitButton =
    categoryForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;

let editingCategoryId: number | string | null = null;
let editingRow: HTMLTableRowElement | null = null;

const resetFormState = () => {
    editingCategoryId = null;
    editingRow = null;
    if (modalTitle) {
        modalTitle.textContent = "Nueva categoría";
    }
    if (submitButton) {
        submitButton.textContent = "Guardar";
    }
    categoryForm?.reset();
};

const getModalCloseButtons = (): HTMLButtonElement[] => {
    if (!categoryModal) return [];
    return Array.from(categoryModal.querySelectorAll<HTMLButtonElement>("[data-close-modal]"));
};

const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeCategoryModal();
};

const openCategoryModal = () => {
    if (!categoryModal) return;

    categoryModal.classList.remove("hidden");
    categoryModal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", handleEscapeKey);

    window.requestAnimationFrame(() => {
        nameInput?.focus();
    });
};

function closeCategoryModal() {
    if (!categoryModal) return;

    categoryModal.classList.add("hidden");
    categoryModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    document.removeEventListener("keydown", handleEscapeKey);
    resetFormState();
}

const startEditingCategory = (row: HTMLTableRowElement, data: CategoryRowData) => {
    editingCategoryId = data.id;
    editingRow = row;

    if (modalTitle) {
        modalTitle.textContent = "Editar categoría";
    }
    if (submitButton) {
        submitButton.textContent = "Actualizar";
    }

    categoryForm?.reset();

    if (nameInput) {
        nameInput.value = data.nombre;
    }
    if (descriptionInput) {
        descriptionInput.value = data.descripcion;
    }
    if (imageInput) {
        imageInput.value = data.imagenUrl ?? "";
    }

    openCategoryModal();
};

newCategoryButton?.addEventListener("click", () => {
    resetFormState();
    openCategoryModal();
});

getModalCloseButtons().forEach((button) => {
    button.addEventListener("click", () => {
        closeCategoryModal();
    });
});

categoryModal?.addEventListener("click", (event) => {
    if (event.target === categoryModal) {
        closeCategoryModal();
    }
});

modalContent?.addEventListener("click", (event) => {
    event.stopPropagation();
});

const removePlaceholderRow = () => {
    if (!categoryTableBody) return;
    const placeholderRow = categoryTableBody.querySelector<HTMLTableRowElement>("[data-placeholder-row]");
    placeholderRow?.remove();
};

const buildActionsCell = (row: HTMLTableRowElement, data: CategoryRowData) => {
    const actionsCell = document.createElement("td");
    actionsCell.className = "px-6 py-4 text-right text-sm";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className =
        "rounded-lg border border-primary px-3 py-1 text-primary transition hover:bg-primary hover:text-white";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => {
        startEditingCategory(row, data);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
        "ml-2 rounded-lg border border-danger px-3 py-1 text-danger transition hover:bg-danger hover:text-white";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", async () => {
        const shouldDelete = window.confirm("¿Querés eliminar esta categoría?");
        if (!shouldDelete) return;

        // Fetch para eliminar la categoría
        try {
            const response = await fetch(`${CATEGORY_API_URL}${data.id}/delete`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const errorMessage = (await response.text()) || "No se pudo eliminar la categoría.";
                window.alert(errorMessage);
                return;
            }
        } catch (error) {
            window.alert("Ocurrió un problema al eliminar la categoría. Intentalo nuevamente.");
            return;
        }

        if (editingCategoryId === data.id) {
            closeCategoryModal();
        }

        row.remove();
    });

    actionsCell.append(editButton, deleteButton);
    return actionsCell;
};

const createCategoryRow = ({ id, nombre, descripcion, imagenUrl }: CategoryRowData): HTMLTableRowElement => {
    const row = document.createElement("tr");
    row.className = "transition hover:bg-primary/5";
    row.dataset.categoryId = String(id);

    const idCell = document.createElement("td");
    idCell.className = "px-6 py-4 text-sm font-medium text-dark/80";
    idCell.textContent = String(id);

    const imageCell = document.createElement("td");
    imageCell.className = "px-6 py-4";
    if (imagenUrl) {
        const image = document.createElement("img");
        image.src = imagenUrl;
        image.alt = nombre;
        image.className = "h-12 w-12 rounded-lg object-cover shadow-sm";
        imageCell.appendChild(image);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className =
            "flex h-12 w-12 items-center justify-center rounded-lg bg-gray/10 text-xs font-semibold text-gray/50";
        placeholder.textContent = "Sin foto";
        imageCell.appendChild(placeholder);
    }

    const nameCell = document.createElement("td");
    nameCell.className = "px-6 py-4 text-sm font-semibold text-dark";
    nameCell.textContent = nombre;

    const descriptionCell = document.createElement("td");
    descriptionCell.className = "px-6 py-4 text-sm text-dark/70";
    descriptionCell.textContent = descripcion;

    row.append(
        idCell,
        imageCell,
        nameCell,
        descriptionCell,
        buildActionsCell(row, { id, nombre, descripcion, imagenUrl })
    );
    return row;
};

const appendCategoryRow = (data: CategoryRowData) => {
    if (!categoryTableBody) return;
    removePlaceholderRow();
    categoryTableBody.appendChild(createCategoryRow(data));
};

// Fetch para cargar las categorías
const loadCategories = async () => {
    const response = await fetch(CATEGORY_API_URL);
    if (!response.ok) return;

    const categories = (await response.json()) as Array<CategoryRowData & { url?: string | null }>;
    if (!Array.isArray(categories)) return;

    categories.forEach((category) => {
        appendCategoryRow({
            id: category.id,
            nombre: category.nombre,
            descripcion: category.descripcion,
            imagenUrl: category.imagenUrl ?? (category.url ?? undefined)
        });
    });
};

loadCategories();

categoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!categoryForm) return;

    const formData = new FormData(categoryForm);
    const nombre = formData.get("nombre")?.toString().trim() ?? "";
    const descripcion = formData.get("descripcion")?.toString().trim() ?? "";
    const imagenUrlRaw = formData.get("imagenUrl")?.toString().trim() ?? "";
    const normalizedImageUrl = imagenUrlRaw.length > 0 ? imagenUrlRaw : undefined;


    if (!nombre || !descripcion) {
        console.warn("Nombre y descripción son obligatorios.");
        return;
    }

    const requestPayload = {
        nombre,
        descripcion,
        url: imagenUrlRaw
    };


    // Fetch para editar la categoría
    if (editingCategoryId !== null) {
        const response = await fetch(`${CATEGORY_API_URL}${editingCategoryId}/edit`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) return;

        if (categoryTableBody && editingRow) {
            const updatedRow = createCategoryRow({
                id: editingCategoryId,
                nombre,
                descripcion,
                imagenUrl: normalizedImageUrl
            });
            categoryTableBody.replaceChild(updatedRow, editingRow);
        }

        closeCategoryModal();
        return;
    }

    // Fetch para crear la categoría
    const response = await fetch(CATEGORY_API_URL_CREATE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
    });

    const body = response.ok ? ((await response.json()) as { id?: number | string } | null) : null;
    const categoryId = body?.id ?? Date.now();

    appendCategoryRow({
        id: categoryId,
        nombre,
        descripcion,
        imagenUrl: normalizedImageUrl
    });

    closeCategoryModal();
    location.reload();
});
