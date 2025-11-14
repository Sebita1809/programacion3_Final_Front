import { renderNavBarUserName } from "../../utils/navBarName";
import { getStoredUserOrRedirect, registerLogoutHandler } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import { addItemToCart } from "../../utils/cartStorage";
import type { ServerProductDTO } from "../../types/adminProducts";
import type { IProduct } from "../../types/IProduct";
import type { IUser } from "../../types/IUser";

const PRODUCT_DETAIL_STORAGE_KEY = "selectedProductDetail";

const elements = {
    navbarRole: document.getElementById("navbar-role"),
    userNameContainer: document.getElementById("navbar-user-name-container"),
    logoutBtn: document.getElementById("logout-btn"),
    adminNavLink: document.getElementById("nav-admin-link"),
    loading: document.getElementById("product-detail-loading"),
    error: document.getElementById("product-detail-error"),
    errorMessage: document.getElementById("product-error-message"),
    content: document.getElementById("product-detail-content"),
    image: document.getElementById("product-image") as HTMLImageElement | null,
    categoryPill: document.getElementById("product-category-pill") as HTMLSpanElement | null,
    title: document.getElementById("product-title"),
    price: document.getElementById("product-price"),
    description: document.getElementById("product-description"),
    quantityInput: document.getElementById("product-quantity") as HTMLInputElement | null,
    quantityDecrease: document.getElementById("product-quantity-decrease") as HTMLButtonElement | null,
    quantityIncrease: document.getElementById("product-quantity-increase") as HTMLButtonElement | null,
    addToCartBtn: document.getElementById("product-add-to-cart") as HTMLButtonElement | null,
    stockInline: document.getElementById("product-stock-inline")
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

const retrieveStoredProduct = (): IProduct | null => {
    if (!supportsSessionStorage()) return null;
    try {
        const raw = window.sessionStorage.getItem(PRODUCT_DETAIL_STORAGE_KEY);
        if (!raw) return null;
        window.sessionStorage.removeItem(PRODUCT_DETAIL_STORAGE_KEY);
        const parsed = JSON.parse(raw) as Partial<IProduct>;
        if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "number") {
            return null;
        }
        return parsed as IProduct;
    } catch (error) {
        console.warn("No se pudo recuperar el producto guardado:", error);
        return null;
    }
};

const setupNavBar = (user: IUser) => {
    if (elements.navbarRole) {
        elements.navbarRole.textContent = user.rol === "ADMIN" ? "Admin" : user.rol ?? "";
    }
    renderNavBarUserName(elements.userNameContainer);
    elements.adminNavLink?.classList.toggle("hidden", user.rol !== "ADMIN");
    registerLogoutHandler(elements.logoutBtn);
};

const getProductIdFromQuery = (): number | null => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (!idParam) return null;
    const parsed = Number(idParam);
    return Number.isFinite(parsed) ? parsed : null;
};

const toggleVisibility = (element: HTMLElement | null, visible: boolean) => {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
};

const showLoading = (visible: boolean) => toggleVisibility(elements.loading, visible);
const showError = (message: string) => {
    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
    }
    toggleVisibility(elements.error, true);
    toggleVisibility(elements.content, false);
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

const fetchProductById = async (id: number): Promise<IProduct | null> => {
    try {
        const response = await fetch(`${API_ENDPOINTS.products}${id}`);
        if (!response.ok) return null;
        const data = (await response.json()) as ServerProductDTO;
        return normalizeProduct(data);
    } catch (error) {
        console.error("No se pudo cargar el producto:", error);
        return null;
    }
};

let currentProduct: IProduct | null = null;

const renderProduct = (product: IProduct) => {
    currentProduct = product;

    if (elements.image) {
        if (product.imagenUrl) {
            elements.image.src = product.imagenUrl;
            elements.image.alt = product.nombre;
        } else {
            elements.image.src =
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80";
            elements.image.alt = product.nombre;
        }
    }

    if (elements.categoryPill) {
        if (product.categoria?.nombre) {
            elements.categoryPill.textContent = product.categoria.nombre;
            elements.categoryPill.classList.remove("hidden");
        } else {
            elements.categoryPill.classList.add("hidden");
        }
    }

    if (elements.title) {
        elements.title.textContent = product.nombre;
    }

    if (elements.price) {
        elements.price.textContent = formatCurrency(product.precio);
    }

    if (elements.description) {
        elements.description.textContent =
            product.descripcion ?? "Este producto aún no tiene descripción.";
    }

    const inStock = product.stock > 0;
    if (elements.stockInline) {
        elements.stockInline.textContent = inStock ? `Stock: ${product.stock}` : "Sin stock";
        elements.stockInline.className = inStock
            ? "text-xs font-semibold text-dark/50"
            : "text-xs font-semibold text-danger/70";
    }
    toggleStockControls(inStock);

    toggleVisibility(elements.content, true);
};

const clampQuantity = (value: number, stock?: number): number => {
    if (typeof stock === "number" && stock <= 0) {
        return 0;
    }
    const normalized = Number.isFinite(value) ? value : 1;
    const min = 1;
    if (typeof stock === "number" && stock > 0) {
        return Math.min(Math.max(normalized, min), stock);
    }
    return Math.max(normalized, min);
};

const getQuantityValue = (): number => {
    const raw = Number(elements.quantityInput?.value ?? 1);
    return clampQuantity(raw, currentProduct?.stock);
};

const setQuantityValue = (value: number) => {
    if (!elements.quantityInput) return;
    elements.quantityInput.value = String(clampQuantity(value, currentProduct?.stock));
};

const toggleStockControls = (inStock: boolean) => {
    if (elements.quantityInput) {
        elements.quantityInput.disabled = !inStock;
        elements.quantityInput.value = inStock ? "1" : "0";
    }

    const controls = [elements.quantityDecrease, elements.quantityIncrease];
    controls.forEach((control) => {
        control?.toggleAttribute("disabled", !inStock);
        control?.classList.toggle("opacity-60", !inStock);
        control?.classList.toggle("cursor-not-allowed", !inStock);
    });

    if (elements.addToCartBtn) {
        elements.addToCartBtn.disabled = !inStock;
        elements.addToCartBtn.textContent = inStock ? "🛒 Agregar al carrito" : "Sin stock";
        elements.addToCartBtn.classList.toggle("opacity-70", !inStock);
        elements.addToCartBtn.classList.toggle("cursor-not-allowed", !inStock);
    }
};

const handleQuantityDelta = (delta: number) => {
    const current = getQuantityValue();
    setQuantityValue(current + delta);
};

const handleAddToCart = () => {
    if (!currentProduct) return;
    if (currentProduct.stock <= 0) {
        window.alert("Este producto no tiene stock disponible en este momento.");
        return;
    }
    const quantity = getQuantityValue();
    addItemToCart({
        id: currentProduct.id,
        nombre: currentProduct.nombre,
        descripcion: currentProduct.descripcion,
        precio: currentProduct.precio,
        stock: currentProduct.stock,
        imagenUrl: currentProduct.imagenUrl,
        quantity
    });
    window.location.href = "../cart/cart.html";
};

const init = async () => {
    const user = getStoredUserOrRedirect();
    setupNavBar(user);

    elements.quantityDecrease?.addEventListener("click", () => handleQuantityDelta(-1));
    elements.quantityIncrease?.addEventListener("click", () => handleQuantityDelta(1));
    elements.quantityInput?.addEventListener("change", () => setQuantityValue(getQuantityValue()));
    elements.addToCartBtn?.addEventListener("click", handleAddToCart);

    const productId = getProductIdFromQuery();
    const storedProduct = retrieveStoredProduct();

    if (storedProduct && (!productId || storedProduct.id === productId)) {
        showLoading(false);
        toggleVisibility(elements.error, false);
        renderProduct(storedProduct);
        return;
    }

    if (!productId) {
        showLoading(false);
        showError("No se encontró el producto solicitado.");
        return;
    }

    showLoading(true);
    const product = await fetchProductById(productId);
    showLoading(false);

    if (!product) {
        showError("No pudimos cargar este producto. Intentá nuevamente más tarde.");
        return;
    }

    toggleVisibility(elements.error, false);
    renderProduct(product);
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
