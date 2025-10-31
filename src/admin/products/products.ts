import { renderNavBarUserName } from "../../utils/navBarName";
import { registerLogoutHandler, requireAdminSession } from "../../utils/auth";
import type { CategoryOption, ProductRowData, ServerProductDTO } from "../../types/adminProducts";

const CATEGORY_API_URL = "http://localhost:8080/category/";
const PRODUCT_API_URL = "http://localhost:8080/product/";
const PRODUCT_API_URL_CREATE = "http://localhost:8080/product/create";

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");

const adminUser = requireAdminSession();

if (roleLabel) {
    roleLabel.textContent = adminUser.rol === "ADMIN" ? "Admin" : adminUser.rol ?? "";
}

renderNavBarUserName(userNameContainer);

registerLogoutHandler(logoutButton);

const newProductButton = document.getElementById("toggle-product-form") as HTMLButtonElement | null;
const productModal = document.getElementById("product-modal") as HTMLDivElement | null;
const modalContent = document.getElementById("product-modal-content") as HTMLDivElement | null;
const productForm = document.getElementById("product-form") as HTMLFormElement | null;
const productTableBody = document.getElementById("product-table-body") as HTMLTableSectionElement | null;
const productNameInput = document.getElementById("product-name") as HTMLInputElement | null;
const productPriceInput = document.getElementById("product-price") as HTMLInputElement | null;
const productDescriptionInput = document.getElementById("product-description") as HTMLTextAreaElement | null;
const productImageInput = document.getElementById("product-image") as HTMLInputElement | null;
const productStockInput = document.getElementById("product-stock") as HTMLInputElement | null;
const modalTitle = document.getElementById("product-modal-title") as HTMLHeadingElement | null;
const categorySelect = document.getElementById("product-category") as HTMLSelectElement | null;

const submitButton =
    productForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;

let editingProductId: number | string | null = null;
let cachedCategories: CategoryOption[] | null = null;

let productList: ProductRowData[] = [];

const formatPrice = (value: number): string => {
    if (!Number.isFinite(value)) return "-";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2
    }).format(value);
};

const serializeProductRowData = (data: ProductRowData) => ({
    ...data,
    categoria: data.categoria ? { id: data.categoria.id, nombre: data.categoria.nombre } : null
});

const getRowData = (row: HTMLTableRowElement): ProductRowData | null => {
    const raw = row.dataset.product;
    return raw ? (JSON.parse(raw) as ProductRowData) : null;
};

const populateCategorySelect = (categories: CategoryOption[]) => {
    if (!categorySelect) return;

    categorySelect.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    placeholderOption.textContent = "Seleccioná una categoría";
    categorySelect.appendChild(placeholderOption);

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.nombre;
        option.textContent = category.nombre;
        categorySelect.appendChild(option);
    });
};

const ensureCategoryOptions = async () => {
    if (cachedCategories) {
        populateCategorySelect(cachedCategories);
        return;
    }

    const response = await fetch(CATEGORY_API_URL);
    const categories = (await response.json()) as CategoryOption[];

    cachedCategories = Array.isArray(categories)
        ? categories
              .filter((category) => typeof category?.id !== "undefined" && category?.nombre)
              .map((category) => ({
                  id: category.id,
                  nombre: category.nombre
              }))
        : [];

    populateCategorySelect(cachedCategories);
};

const resetFormState = () => {
    editingProductId = null;
    if (modalTitle) {
        modalTitle.textContent = "Nuevo producto";
    }
    if (submitButton) {
        submitButton.textContent = "Guardar";
    }
    productForm?.reset();
    if (categorySelect) {
        const disabledOption = categorySelect.querySelector("option[value='']") ?? null;
        if (disabledOption) {
            (disabledOption as HTMLOptionElement).selected = true;
        }
    }
};

const getModalCloseButtons = (): HTMLButtonElement[] => {
    if (!productModal) return [];
    return Array.from(productModal.querySelectorAll<HTMLButtonElement>("[data-close-modal]"));
};

const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeProductModal();
};

const openProductModal = () => {
    if (!productModal) return;

    productModal.classList.remove("hidden");
    productModal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", handleEscapeKey);

    window.requestAnimationFrame(() => {
        productNameInput?.focus();
    });
};

function closeProductModal() {
    if (!productModal) return;

    productModal.classList.add("hidden");
    productModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    document.removeEventListener("keydown", handleEscapeKey);
    resetFormState();
}

const startEditingProduct = async (row: HTMLTableRowElement) => {
    const rowData = getRowData(row);
    if (!rowData) return;

    editingProductId = rowData.id;
    if (modalTitle) {
        modalTitle.textContent = "Editar producto";
    }
    if (submitButton) {
        submitButton.textContent = "Actualizar";
    }

    await ensureCategoryOptions();

    if (productNameInput) {
        productNameInput.value = rowData.nombre;
    }
    if (productPriceInput) {
        productPriceInput.value = Number.isFinite(rowData.precio) ? String(rowData.precio) : "";
    }
    if (productDescriptionInput) {
        productDescriptionInput.value = rowData.descripcion ?? "";
    }
    if (productImageInput) {
        productImageInput.value = rowData.imagenUrl ?? "";
    }
    if (productStockInput) {
        const sanitizedStock =
            Number.isFinite(rowData.stock) && rowData.stock >= 0
                ? Math.floor(rowData.stock)
                : 0;
        productStockInput.value = String(sanitizedStock);
    }
    if (categorySelect) {
        const categoryName = rowData.categoria?.nombre ?? "";
        if (categoryName) {
            const optionExists = Array.from(categorySelect.options).some(
                (option) => option.value === categoryName
            );
            if (!optionExists) {
                const option = document.createElement("option");
                option.value = categoryName;
                option.textContent = categoryName;
                categorySelect.appendChild(option);
            }
            categorySelect.value = categoryName;
        } else {
            categorySelect.value = "";
        }
    }

    openProductModal();
};

const handleDeleteProduct = async (row: HTMLTableRowElement) => {
    const rowData = getRowData(row);
    if (!rowData) return;

    const shouldDelete = window.confirm("¿Querés eliminar este producto?");
    if (!shouldDelete) return;

    await fetch(`${PRODUCT_API_URL}${rowData.id}/delete`, {
        method: "DELETE"
    });

    if (editingProductId === rowData.id) {
        closeProductModal();
    }

    await loadProducts();
};

const buildActionsCell = (row: HTMLTableRowElement): HTMLTableCellElement => {
    const actionsCell = document.createElement("td");
    actionsCell.className = "px-6 py-4 text-right text-sm";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className =
        "rounded-lg border border-primary px-3 py-1 text-primary transition hover:bg-primary hover:text-white";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => {
        void startEditingProduct(row);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
        "ml-2 rounded-lg border border-danger px-3 py-1 text-danger transition hover:bg-danger hover:text-white";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => {
        void handleDeleteProduct(row);
    });

    actionsCell.append(editButton, deleteButton);
    return actionsCell;
};

const createProductRow = (data: ProductRowData): HTMLTableRowElement => {
    const row = document.createElement("tr");
    row.className = "transition hover:bg-primary/5";
    row.dataset.productId = String(data.id);
    row.dataset.product = JSON.stringify(serializeProductRowData(data));

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
    descriptionCell.textContent =
        data.descripcion && data.descripcion.length > 0 ? data.descripcion : "Sin descripción";

    const priceCell = document.createElement("td");
    priceCell.className = "px-6 py-4 text-sm text-dark/80";
    priceCell.textContent = formatPrice(data.precio);

    const categoryCell = document.createElement("td");
    categoryCell.className = "px-6 py-4 text-sm text-dark/80";
    categoryCell.textContent = data.categoria?.nombre ?? "Sin categoría";

    const stockCell = document.createElement("td");
    stockCell.className = "px-6 py-4 text-sm text-dark/80";
    const hasStock = Number(data.stock) > 0;
    stockCell.textContent = hasStock ? "Sí" : "No";

    row.append(
        idCell,
        imageCell,
        nameCell,
        descriptionCell,
        priceCell,
        categoryCell,
        stockCell,
        buildActionsCell(row)
    );

    return row;
};

const renderProductTable = () => {
    if (!productTableBody) return;

    productTableBody.innerHTML = "";

    if (productList.length === 0) {
        const placeholderRow = document.createElement("tr");
        placeholderRow.dataset.placeholderRow = "true";

        const placeholderCell = document.createElement("td");
        placeholderCell.colSpan = 8;
        placeholderCell.className = "px-6 py-8 text-center text-sm text-dark/50";
        placeholderCell.textContent = "Aún no creaste productos.";
        placeholderRow.appendChild(placeholderCell);

        productTableBody.appendChild(placeholderRow);
        return;
    }

    productList.forEach((product) => {
        const row = createProductRow(product);
        productTableBody.appendChild(row);
    });
};

const mapServerProduct = (product: ServerProductDTO): ProductRowData => {
    const precio = Number(product.precio ?? 0);
    const stock = Number(product.stock ?? 0);
    const categoria =
        product.categoria && typeof product.categoria.id !== "undefined" && product.categoria.nombre
            ? { id: product.categoria.id, nombre: product.categoria.nombre }
            : null;

    const descripcion =
        typeof product.descripcion === "string" ? product.descripcion : "";

    return {
        id: product.id,
        nombre: product.nombre,
        precio: Number.isFinite(precio) ? precio : 0,
        stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
        imagenUrl: product.url ?? undefined,
        categoria,
        descripcion
    };
};

async function loadProducts(): Promise<void> {
    const response = await fetch(PRODUCT_API_URL);
    const products = (await response.json()) as ServerProductDTO[];
    productList = Array.isArray(products) ? products.map(mapServerProduct) : [];
    renderProductTable();
}

newProductButton?.addEventListener("click", async () => {
    resetFormState();
    await ensureCategoryOptions();
    openProductModal();
});

getModalCloseButtons().forEach((button) => {
    button.addEventListener("click", () => {
        closeProductModal();
    });
});

productModal?.addEventListener("click", (event) => {
    if (event.target === productModal) {
        closeProductModal();
    }
});

modalContent?.addEventListener("click", (event) => {
    event.stopPropagation();
});

productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!productForm) return;

    const formData = new FormData(productForm);
    const nombre = formData.get("nombre")?.toString().trim() ?? "";
    const descripcion = formData.get("descripcion")?.toString().trim() ?? "";
    const precioValue = formData.get("precio")?.toString().trim() ?? "";
    const categoriaNombre = formData.get("categoria")?.toString().trim() ?? "";
    const imagenUrl = formData.get("imagenUrl")?.toString().trim() ?? "";
    const stockValueRaw = formData.get("stock")?.toString().trim() ?? "";

    const precio = Number(precioValue);
    const stockParsed = Number(stockValueRaw);
    const stock =
        Number.isFinite(stockParsed) && stockParsed >= 0 ? Math.floor(stockParsed) : 0;

    if (!nombre || Number.isNaN(precio) || !categoriaNombre) {
        return;
    }

    const payload = {
        nombre,
        precio,
        stock,
        descripcion,
        url: imagenUrl,
        categoria: categoriaNombre
    };

    if (editingProductId !== null) {
        await fetch(`${PRODUCT_API_URL}${editingProductId}/edit`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        await loadProducts();
        closeProductModal();
        return;
    }

    await fetch(PRODUCT_API_URL_CREATE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    await loadProducts();
    closeProductModal();
});

renderProductTable();
void ensureCategoryOptions();
void loadProducts();
