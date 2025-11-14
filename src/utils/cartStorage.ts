export interface CartItem {
    id: number | string;
    nombre: string;
    descripcion?: string;
    precio: number;
    stock: number;
    imagenUrl?: string;
    quantity: number;
}

const CART_STORAGE_KEY = "cartItems";

const hasStorageSupport = (): boolean =>
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const sanitizeStock = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
};

const sanitizeQuantity = (value: unknown, stock?: number): number => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    const normalized = Math.floor(parsed);
    if (normalized <= 0) {
        return 0;
    }

    if (typeof stock === "number") {
        if (!Number.isFinite(stock) || stock <= 0) {
            return 0;
        }
        return Math.min(normalized, Math.floor(stock));
    }

    return normalized;
};

const toCartItem = (raw: unknown): CartItem | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }

    const candidate = raw as Record<string, unknown>;
    const id = candidate.id;
    if (typeof id !== "string" && typeof id !== "number") {
        return null;
    }

    const nombre = candidate.nombre;
    if (typeof nombre !== "string" || nombre.trim() === "") {
        return null;
    }

    const precio = typeof candidate.precio === "number" ? candidate.precio : Number(candidate.precio);
    if (!Number.isFinite(precio)) {
        return null;
    }

    const stockValue = sanitizeStock(candidate.stock) ?? 0;
    const quantity = sanitizeQuantity(candidate.quantity, stockValue);

    if (quantity === 0) {
        return null;
    }

    return {
        id,
        nombre,
        descripcion: typeof candidate.descripcion === "string" ? candidate.descripcion : undefined,
        precio,
        stock: stockValue,
        imagenUrl:
            typeof candidate.imagenUrl === "string" && candidate.imagenUrl.trim() !== ""
                ? candidate.imagenUrl
                : undefined,
        quantity
    };
};

const readCartFromStorage = (): CartItem[] => {
    if (!hasStorageSupport()) {
        return [];
    }

    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            window.localStorage.removeItem(CART_STORAGE_KEY);
            return [];
        }

        return parsed
            .map(toCartItem)
            .filter((item): item is CartItem => Boolean(item))
            .map((item) => ({ ...item }));
    } catch (error) {
        console.error("No se pudo parsear el carrito almacenado:", error);
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return [];
    }
};

const persistCart = (items: CartItem[]): void => {
    if (!hasStorageSupport()) {
        return;
    }

    try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error("No se pudo guardar el carrito:", error);
    }
};

export const getCartItems = (): CartItem[] => readCartFromStorage();

export const clearCart = (): void => {
    if (!hasStorageSupport()) {
        return;
    }

    window.localStorage.removeItem(CART_STORAGE_KEY);
};

export const addItemToCart = (
    item: Omit<CartItem, "quantity"> & { quantity?: number }
): void => {
    if (!hasStorageSupport()) return;

    const cartItems = readCartFromStorage();
    const quantityToAdd = sanitizeQuantity(item.quantity ?? 1, item.stock);
    if (quantityToAdd <= 0) {
        console.warn("Intento de agregar un producto sin stock disponible al carrito.", item);
        return;
    }

    const existingIndex = cartItems.findIndex((cartItem) => String(cartItem.id) === String(item.id));
    if (existingIndex >= 0) {
        const existing = cartItems[existingIndex];
        const nextQuantity = sanitizeQuantity(existing.quantity + quantityToAdd, existing.stock);
        cartItems[existingIndex] = {
            ...existing,
            quantity: nextQuantity || existing.quantity
        };
    } else {
        const sanitizedQuantity = sanitizeQuantity(quantityToAdd, item.stock);
        if (sanitizedQuantity > 0) {
            cartItems.push({
                ...item,
                quantity: sanitizedQuantity
            });
        }
    }

    persistCart(cartItems);
};

export const updateCartItemQuantity = (itemId: CartItem["id"], nextQuantity: number): void => {
    if (!hasStorageSupport()) {
        return;
    }

    const cartItems = readCartFromStorage();
    const index = cartItems.findIndex((item) => String(item.id) === String(itemId));

    if (index === -1) {
        return;
    }

    const normalizedQuantity = sanitizeQuantity(nextQuantity, cartItems[index].stock);

    if (normalizedQuantity <= 0) {
        cartItems.splice(index, 1);
    } else {
        cartItems[index] = {
            ...cartItems[index],
            quantity: normalizedQuantity
        };
    }

    persistCart(cartItems);
};
