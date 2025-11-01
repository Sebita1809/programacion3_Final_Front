import { renderNavBarUserName } from "../../utils/navBarName";
import {
    registerLogoutHandler,
    requireAdminSession
} from "../../utils/auth";
import type { CategoryPayload, CategoryRowData } from "../../types/adminCategories";

const API_BASE_URL = "http://localhost:8080";
const API_ENDPOINTS = {
    categories: `${API_BASE_URL}/category/`,
    create: `${API_BASE_URL}/category/create`
} as const;

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");

const adminUser = requireAdminSession();

if (roleLabel) {
    roleLabel.textContent = adminUser.rol === "ADMIN" ? "Admin" : adminUser.rol ?? "";
}

renderNavBarUserName(userNameContainer);
registerLogoutHandler(logoutButton);

const elements = {
    newCategoryButton: document.getElementById("toggle-category-form") as HTMLButtonElement | null,
    modal: document.getElementById("category-modal") as HTMLDivElement | null,
    modalContent: document.getElementById("category-modal-content") as HTMLDivElement | null,
    form: document.getElementById("category-form") as HTMLFormElement | null,
    nameInput: document.getElementById("category-name") as HTMLInputElement | null,
    tableBody: document.getElementById("category-table-body") as HTMLTableSectionElement | null,
    descriptionInput: document.getElementById("category-description") as HTMLTextAreaElement | null,
    imageInput: document.getElementById("category-image") as HTMLInputElement | null,
    modalTitle: document.getElementById("category-modal-title") as HTMLHeadingElement | null
} as const;

const submitButton =
    elements.form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;

type CategoryState = {
    editingCategoryId: number | string | null;
    categories: CategoryRowData[];
};

const state: CategoryState = {
    editingCategoryId: null,
    categories: []
};

const serializeCategoryRowData = (data: CategoryRowData) => ({
    ...data
});

const getRowData = (row: HTMLTableRowElement): CategoryRowData | null => {
    const raw = row.dataset.category;
    return raw ? (JSON.parse(raw) as CategoryRowData) : null;
};

const resetFormState = () => {
    state.editingCategoryId = null;

    if (elements.modalTitle) {
        elements.modalTitle.textContent = "Nueva categoría";
    }
    if (submitButton) {
        submitButton.textContent = "Guardar";
    }

    elements.form?.reset();
};

const getModalCloseButtons = (): HTMLButtonElement[] => {
    if (!elements.modal) return [];
    return Array.from(elements.modal.querySelectorAll<HTMLButtonElement>("[data-close-modal]"));
};

const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeCategoryModal();
};

const openCategoryModal = () => {
    const { modal, nameInput } = elements;
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", handleEscapeKey);

    window.requestAnimationFrame(() => {
        nameInput?.focus();
    });
};

function closeCategoryModal() {
    const { modal } = elements;
    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    document.removeEventListener("keydown", handleEscapeKey);
    resetFormState();
}

const buildActionsCell = (row: HTMLTableRowElement): HTMLTableCellElement => {
    const actionsCell = document.createElement("td");
    actionsCell.className = "px-6 py-4 text-right text-sm";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className =
        "rounded-lg border border-primary px-3 py-1 text-primary transition hover:bg-primary hover:text-white";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => {
        startEditingCategory(row);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
        "ml-2 rounded-lg border border-danger px-3 py-1 text-danger transition hover:bg-danger hover:text-white";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => {
        void handleDeleteCategory(row);
    });

    actionsCell.append(editButton, deleteButton);
    return actionsCell;
};

const createCategoryRow = (data: CategoryRowData): HTMLTableRowElement => {
    const row = document.createElement("tr");
    row.className = "transition hover:bg-primary/5";
    row.dataset.categoryId = String(data.id);
    row.dataset.category = JSON.stringify(serializeCategoryRowData(data));

    const idCell = document.createElement("td");
    idCell.className = "px-6 py-4 text-sm font-medium text-dark/80";
    idCell.textContent = String(data.id);

    const imageCell = document.createElement("td");
    imageCell.className = "px-6 py-4";
    if (data.imagenUrl) {
        const image = document.createElement("img");
        image.src = data.imagenUrl;
        image.alt = data.nombre;
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
    nameCell.textContent = data.nombre;

    const descriptionCell = document.createElement("td");
    descriptionCell.className = "px-6 py-4 text-sm text-dark/70";
    descriptionCell.textContent = data.descripcion;

    row.append(idCell, imageCell, nameCell, descriptionCell, buildActionsCell(row));
    return row;
};

const renderCategoryTable = () => {
    const { tableBody } = elements;
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (state.categories.length === 0) {
        const placeholderRow = document.createElement("tr");
        placeholderRow.dataset.placeholderRow = "true";

        const placeholderCell = document.createElement("td");
        placeholderCell.colSpan = 5;
        placeholderCell.className = "px-6 py-8 text-center text-sm text-dark/50";
        placeholderCell.textContent = "Aún no creaste categorías.";
        placeholderRow.appendChild(placeholderCell);

        tableBody.appendChild(placeholderRow);
        return;
    }

    state.categories.forEach((category) => {
        tableBody.appendChild(createCategoryRow(category));
    });
};

const loadCategories = async () => {
    const response = await fetch(API_ENDPOINTS.categories);
    if (!response.ok) {
        state.categories = [];
        renderCategoryTable();
        return;
    }

    const categories = (await response.json()) as CategoryRowData[];
    state.categories = Array.isArray(categories) ? categories : [];

    renderCategoryTable();
};

const startEditingCategory = (row: HTMLTableRowElement) => {
    const data = getRowData(row);
    if (!data) return;

    state.editingCategoryId = data.id;

    if (elements.modalTitle) {
        elements.modalTitle.textContent = "Editar categoría";
    }
    if (submitButton) {
        submitButton.textContent = "Actualizar";
    }

    if (elements.nameInput) {
        elements.nameInput.value = data.nombre;
    }
    if (elements.descriptionInput) {
        elements.descriptionInput.value = data.descripcion;
    }
    if (elements.imageInput) {
        elements.imageInput.value = data.imagenUrl ?? "";
    }

    openCategoryModal();
};

const handleDeleteCategory = async (row: HTMLTableRowElement) => {
    const data = getRowData(row);
    if (!data) return;

    const shouldDelete = window.confirm("¿Querés eliminar esta categoría?");
    if (!shouldDelete) return;

    const response = await fetch(`${API_ENDPOINTS.categories}${data.id}/delete`, {
        method: "DELETE"
    });

    if (!response.ok) return;

    if (state.editingCategoryId === data.id) {
        closeCategoryModal();
    }

    await loadCategories();
};

elements.newCategoryButton?.addEventListener("click", () => {
    resetFormState();
    openCategoryModal();
});

getModalCloseButtons().forEach((button) => {
    button.addEventListener("click", () => {
        closeCategoryModal();
    });
});

elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
        closeCategoryModal();
    }
});

elements.modalContent?.addEventListener("click", (event) => {
    event.stopPropagation();
});

elements.form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = elements.form;
    if (!form) return;

    const formData = new FormData(form);
    const nombre = formData.get("nombre")?.toString().trim() ?? "";
    const descripcion = formData.get("descripcion")?.toString().trim() ?? "";
    const imagenUrlRaw = formData.get("imagenUrl")?.toString().trim() ?? "";
    const imagenUrl = imagenUrlRaw.length > 0 ? imagenUrlRaw : undefined;

    if (!nombre || !descripcion) {
        console.warn("Nombre y descripción son obligatorios.");
        return;
    }

    const payload: CategoryPayload = {
        nombre,
        descripcion
    };

    if (imagenUrl) {
        payload.imagenUrl = imagenUrl;
    }

    if (state.editingCategoryId !== null) {
        const response = await fetch(`${API_ENDPOINTS.categories}${state.editingCategoryId}/edit`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return;

        await loadCategories();
        closeCategoryModal();
        return;
    }

    const response = await fetch(API_ENDPOINTS.create, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) return;

    await loadCategories();
    closeCategoryModal();
});

renderCategoryTable();
void loadCategories();
