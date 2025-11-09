import { renderNavBarUserName } from "../../utils/navBarName";
import { getStoredUserOrRedirect, registerLogoutHandler } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import type { ICategoria } from "../../types/ICategoria";
import type { IProduct } from "../../types/IProduct";
import type { IUser } from "../../types/IUser";
import type { ServerProductDTO } from "../../types/adminProducts";

const PRODUCT_DETAIL_STORAGE_KEY = "selectedProductDetail";

type SortOrder = "price-asc" | "price-desc";
type CategoryFilterValue = "all" | string;

const elements = {
    navbarRole: document.getElementById("navbar-role"),
    userNameContainer: document.getElementById("navbar-user-name-container"),
    logoutBtn: document.getElementById("logout-btn"),
    adminNavLink: document.getElementById("nav-admin-link"),
    categoryList: document.getElementById("home-category-list") as HTMLDivElement | null,
    searchInput: document.getElementById("home-search-input") as HTMLInputElement | null,
    sortSelect: document.getElementById("home-sort-select") as HTMLSelectElement | null,
    categoryFilter: document.getElementById("home-filter-select") as HTMLSelectElement | null,
    productsGrid: document.getElementById("home-products-grid") as HTMLDivElement | null,
    loadingState: document.getElementById("home-products-loading") as HTMLDivElement | null,
    emptyState: document.getElementById("home-products-empty") as HTMLDivElement | null,
    emptyMessage: document.getElementById("home-empty-message") as HTMLParagraphElement | null,
    productsTitle: document.getElementById("home-products-title") as HTMLHeadingElement | null
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

const formatCurrency = (value: number): string => currencyFormatter.format(value);

const supportsSessionStorage = (): boolean => {
    try {
        return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
    } catch {
        return false;
    }
};

const rememberProductForDetail = (product: IProduct): void => {
    if (!supportsSessionStorage()) return;
    try {
        window.sessionStorage.setItem(PRODUCT_DETAIL_STORAGE_KEY, JSON.stringify(product));
    } catch (error) {
        console.warn("No se pudo guardar el producto seleccionado:", error);
    }
};

const state = {
    categories: [] as ICategoria[],
    products: [] as IProduct[],
    filters: {
        searchTerm: "",
        category: "all" as CategoryFilterValue,
        sortOrder: "price-asc" as SortOrder
    },
    isLoading: false
};

const setupNavBar = (user: IUser): void => {
    if (elements.navbarRole) {
        elements.navbarRole.textContent = user.rol === "ADMIN" ? "Admin" : user.rol ?? "";
    }

    renderNavBarUserName(elements.userNameContainer);

    if (elements.adminNavLink) {
        elements.adminNavLink.classList.toggle("hidden", user.rol !== "ADMIN");
    }

    registerLogoutHandler(elements.logoutBtn);
};

const normalizeProduct = (product: ServerProductDTO): IProduct => {
    const precio = Number(product.precio ?? 0);
    const stock = Number(product.stock ?? 0);
    const descripcionRaw =
        typeof product.descripcion === "string" ? product.descripcion.trim() : "";
    const descripcion = descripcionRaw.length > 0 ? descripcionRaw : undefined;
    const imagenUrl =
        typeof product.url === "string" && product.url.trim().length > 0
            ? product.url.trim()
            : undefined;

    const categoria =
        product.categoria && typeof product.categoria.id !== "undefined"
            ? {
                  id: Number(product.categoria.id) || Number.parseInt(String(product.categoria.id), 10) || 0,
                  nombre: product.categoria.nombre
              }
            : null;

    return {
        id: Number(product.id) || Number.parseInt(String(product.id), 10) || 0,
        nombre: product.nombre,
        precio: Number.isFinite(precio) ? precio : 0,
        stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
        descripcion,
        imagenUrl,
        categoria
    };
};

const fetchCategories = async (): Promise<ICategoria[]> => {
    try {
        const response = await fetch(API_ENDPOINTS.categories);
        if (!response.ok) throw new Error(`Categorías: ${response.status}`);
        const data = (await response.json()) as ICategoria[];
        return Array.isArray(data)
            ? data
                  .filter((category) => typeof category?.nombre === "string")
                  .map((category) => ({
                      ...category,
                      id:
                          typeof category.id === "number"
                              ? category.id
                              : Number(category.id) ||
                                Number.parseInt(String(category.id), 10) ||
                                0
                  }))
            : [];
    } catch (error) {
        console.error("No se pudo cargar las categorías:", error);
        return [];
    }
};

const fetchProducts = async (): Promise<IProduct[]> => {
    try {
        const response = await fetch(API_ENDPOINTS.products);
        if (!response.ok) throw new Error(`Productos: ${response.status}`);
        const data = (await response.json()) as ServerProductDTO[];
        return Array.isArray(data) ? data.map(normalizeProduct) : [];
    } catch (error) {
        console.error("No se pudo cargar los productos:", error);
        return [];
    }
};

const updateCategoryButtons = () => {
    const container = elements.categoryList;
    if (!container) return;

    container.innerHTML = "";

    const createButton = (label: string, value: CategoryFilterValue, icon: string) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.category = value;
        const isActive = state.filters.category === value;
        button.className = [
            "flex items-center gap-2 rounded-xl border px-4 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isActive ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-primary/5 text-dark/70"
        ].join(" ");
        button.innerHTML = `<span class="text-lg">${icon}</span><span>${label}</span>`;
        button.addEventListener("click", () => {
            setCategoryFilter(value);
            if (elements.categoryFilter) {
                elements.categoryFilter.value = value;
            }
        });
        container.appendChild(button);
    };

    createButton("Todos los productos", "all", "📦");

    state.categories.forEach((category) => {
        createButton(category.nombre, String(category.id), "📁");
    });
};

const populateCategoryFilter = () => {
    if (!elements.categoryFilter) return;
    elements.categoryFilter.innerHTML = "";

    if (
        state.filters.category !== "all" &&
        !state.categories.some((category) => String(category.id) === state.filters.category)
    ) {
        state.filters.category = "all";
    }

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Todos";
    elements.categoryFilter.appendChild(allOption);

    state.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = String(category.id);
        option.textContent = category.nombre;
        elements.categoryFilter?.appendChild(option);
    });

    elements.categoryFilter.value = state.filters.category;
};

const setLoadingState = (loading: boolean) => {
    state.isLoading = loading;
    if (elements.loadingState) {
        elements.loadingState.classList.toggle("hidden", !loading);
    }
};

const setEmptyState = (visible: boolean, message?: string) => {
    if (elements.emptyState) {
        elements.emptyState.classList.toggle("hidden", !visible);
    }
    if (elements.productsGrid) {
        elements.productsGrid.classList.toggle("hidden", visible);
    }
    if (elements.emptyMessage && typeof message === "string") {
        elements.emptyMessage.textContent = message;
    }
};

const createProductCard = (product: IProduct): HTMLElement => {
    const link = document.createElement("a");
    link.href = `../productDetail/productDetail.html?id=${encodeURIComponent(product.id)}`;
    link.className =
        "block rounded-xl border border-transparent transition hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
    link.addEventListener("click", () => {
        rememberProductForDetail(product);
    });

    const card = document.createElement("article");
    card.className = "flex flex-col overflow-hidden rounded-xl border border-gray/30 bg-white";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "h-48 w-full bg-light";

    if (product.imagenUrl) {
        const img = document.createElement("img");
        img.src = product.imagenUrl;
        img.alt = product.nombre;
        img.className = "h-full w-full object-cover";
        imageWrapper.appendChild(img);
    } else {
        imageWrapper.classList.add(
            "flex",
            "items-center",
            "justify-center",
            "text-4xl",
            "text-dark/30"
        );
        imageWrapper.textContent = "🍽️";
    }

    const content = document.createElement("div");
    content.className = "flex flex-1 flex-col gap-3 p-5";

    if (product.categoria?.nombre) {
        const badge = document.createElement("span");
        badge.className =
            "w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary";
        badge.textContent = product.categoria.nombre;
        content.appendChild(badge);
    }

    const title = document.createElement("h3");
    title.className = "text-lg font-semibold text-dark";
    title.textContent = product.nombre;
    content.appendChild(title);

    if (product.descripcion) {
        const description = document.createElement("p");
        description.className = "text-sm text-dark/60";
        description.textContent = product.descripcion;
        content.appendChild(description);
    }

    const footer = document.createElement("div");
    footer.className = "mt-auto flex flex-wrap items-center justify-between gap-3 pt-3";

    const price = document.createElement("span");
    price.className = "text-xl font-bold text-primary";
    price.textContent = formatCurrency(product.precio);
    footer.appendChild(price);

    const stockBadge = document.createElement("span");
    const inStock = product.stock > 0;
    stockBadge.className = `rounded-full px-3 py-1 text-xs font-semibold ${
        inStock ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
    }`;
    stockBadge.textContent = inStock ? "Disponible" : "Sin stock";
    footer.appendChild(stockBadge);

    content.appendChild(footer);

    card.append(imageWrapper, content);
    link.appendChild(card);
    return link;
};

const updateProductsTitle = () => {
    if (!elements.productsTitle) return;
    if (state.filters.category === "all") {
        elements.productsTitle.textContent = "Todos los Productos";
        return;
    }

    const categoryName = state.categories.find(
        (category) => String(category.id) === state.filters.category
    )?.nombre;

    elements.productsTitle.textContent = categoryName ?? "Productos";
};

const renderProducts = (products: IProduct[], emptyMessage?: string) => {
    if (!elements.productsGrid) return;
    elements.productsGrid.innerHTML = "";

    if (products.length === 0) {
        setEmptyState(true, emptyMessage);
        return;
    }

    setEmptyState(false);

    products.forEach((product) => {
        elements.productsGrid?.appendChild(createProductCard(product));
    });
};

const applyFilters = () => {
    let filtered = [...state.products];

    if (state.filters.category !== "all") {
        filtered = filtered.filter((product) => {
            if (!product.categoria) return false;
            return String(product.categoria.id) === state.filters.category;
        });
    }

    if (state.filters.searchTerm.trim()) {
        const needle = state.filters.searchTerm.trim().toLowerCase();
        filtered = filtered.filter((product) => {
            const haystack = `${product.nombre} ${product.descripcion ?? ""}`.toLowerCase();
            return haystack.includes(needle);
        });
    }

    filtered.sort((a, b) => {
        const delta = a.precio - b.precio;
        return state.filters.sortOrder === "price-asc" ? delta : -delta;
    });

    const inSearch = state.filters.searchTerm.trim().length > 0;
    const usingCategory = state.filters.category !== "all";
    const emptyMessage = usingCategory || inSearch
        ? "No hay productos que coincidan con tu búsqueda o filtros."
        : "Todavía no hay productos disponibles.";

    updateProductsTitle();
    renderProducts(filtered, emptyMessage);
};

const setCategoryFilter = (value: CategoryFilterValue) => {
    state.filters.category = value;
    if (elements.categoryFilter && elements.categoryFilter.value !== value) {
        elements.categoryFilter.value = value;
    }
    updateCategoryButtons();
    applyFilters();
};

const attachEventListeners = () => {
    elements.searchInput?.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        state.filters.searchTerm = target.value;
        applyFilters();
    });

    elements.sortSelect?.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        state.filters.sortOrder =
            target.value === "price-desc" ? "price-desc" : ("price-asc" as SortOrder);
        applyFilters();
    });

    elements.categoryFilter?.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        setCategoryFilter((target.value || "all") as CategoryFilterValue);
    });
};

const loadHomeData = async () => {
    setLoadingState(true);
    try {
        const [categories, products] = await Promise.all([fetchCategories(), fetchProducts()]);
        state.categories = categories;
        state.products = products;

        populateCategoryFilter();
        updateCategoryButtons();
        applyFilters();
    } finally {
        setLoadingState(false);
    }
};

const init = () => {
    const userData = getStoredUserOrRedirect();
    setupNavBar(userData);
    attachEventListeners();
    void loadHomeData();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

/*
const LOGIN_URL = "/src/pages/auth/login/login.html";
export const redirect = (url: string) => {
    window.location.href = url;
};

const clearSessionAndRedirect = () => {

/*
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
*/
