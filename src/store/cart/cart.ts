import {
    clearCart,
    getCartItems,
    updateCartItemQuantity,
    type CartItem
} from "../../utils/cartStorage";
import { renderNavBarUserName } from "../../utils/navBarName";
import { getStoredUserOrRedirect, registerLogoutHandler } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import type { IUser } from "../../types/IUser";
import type { IOrderCreateRequest, IOrderDetailRequest } from "../../types/IOrders";

const elements = {
    itemsContainer: document.getElementById("cart-items") as HTMLDivElement | null,
    emptyState: document.getElementById("cart-empty") as HTMLDivElement | null,
    summary: document.getElementById("cart-summary") as HTMLDivElement | null,
    summarySubtotal: document.getElementById("cart-summary-subtotal") as HTMLSpanElement | null,
    summaryShipping: document.getElementById("cart-summary-shipping") as HTMLSpanElement | null,
    summaryTotal: document.getElementById("cart-summary-total") as HTMLSpanElement | null,
    clearButton: document.getElementById("clear-cart") as HTMLButtonElement | null,
    checkoutButton: document.getElementById("checkout-button") as HTMLButtonElement | null,
    checkoutModal: document.getElementById("checkout-modal") as HTMLDivElement | null,
    checkoutModalContent: document.getElementById("checkout-modal-content") as HTMLDivElement | null,
    checkoutModalClose: document.getElementById("checkout-modal-close") as HTMLButtonElement | null,
    checkoutModalTotal: document.getElementById("checkout-modal-total") as HTMLSpanElement | null,
    checkoutForm: document.getElementById("checkout-form") as HTMLFormElement | null,
    checkoutPhone: document.getElementById("checkout-phone") as HTMLInputElement | null,
    checkoutAddress: document.getElementById("checkout-address") as HTMLTextAreaElement | null,
    checkoutPayment: document.getElementById("checkout-payment") as HTMLSelectElement | null
};

const setupNavBar = (user: IUser): void => {
    const navbarRole = document.getElementById("navbar-role");
    const userNameContainer = document.getElementById("navbar-user-name-container");
    const adminNavLink = document.getElementById("nav-admin-link");
    const logoutBtn = document.getElementById("logout-btn");

    if (navbarRole) {
        navbarRole.textContent = user.rol === "ADMIN" ? "Admin" : user.rol ?? "";
    }

    renderNavBarUserName(userNameContainer);

    if (adminNavLink) {
        adminNavLink.classList.toggle("hidden", user.rol !== "ADMIN");
    }

    registerLogoutHandler(logoutBtn);
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

const formatCurrency = (value: number): string => currencyFormatter.format(value);

const SHIPPING_FEE = 500;
let lastTotals = {
    subtotal: 0,
    shipping: 0,
    total: 0
};

const toggleCheckoutButton = (enabled: boolean): void => {
    if (!elements.checkoutButton) return;
    elements.checkoutButton.disabled = !enabled;
    if (!enabled) {
        elements.checkoutButton.classList.add("opacity-50", "cursor-not-allowed");
    } else {
        elements.checkoutButton.classList.remove("opacity-50", "cursor-not-allowed");
    }
};

const openCheckoutModal = (): void => {
    if (!elements.checkoutModal || !elements.checkoutModalContent) return;
    elements.checkoutModal.classList.remove("hidden");
    elements.checkoutModal.classList.add("flex");
    if (elements.checkoutModalTotal) {
        elements.checkoutModalTotal.textContent = formatCurrency(lastTotals.total);
    }
};

const closeCheckoutModal = (): void => {
    if (!elements.checkoutModal || !elements.checkoutForm) return;
    elements.checkoutModal.classList.add("hidden");
    elements.checkoutModal.classList.remove("flex");
    elements.checkoutForm.reset();
};

const renderCartItems = (items: CartItem[]): void => {
    const {
        itemsContainer,
        emptyState,
        summary,
        summarySubtotal,
        summaryShipping,
        summaryTotal,
        clearButton
    } = elements;

    if (!itemsContainer || !emptyState || !summary || !summarySubtotal || !summaryShipping || !summaryTotal || !clearButton) {
        return;
    }

    if (items.length === 0) {
        itemsContainer.classList.add("hidden");
        summary.classList.add("hidden");
        emptyState.classList.remove("hidden");
        itemsContainer.innerHTML = "";
        summarySubtotal.textContent = formatCurrency(0);
        summaryShipping.textContent = formatCurrency(0);
        summaryTotal.textContent = formatCurrency(0);
        lastTotals = { subtotal: 0, shipping: 0, total: 0 };
        toggleCheckoutButton(false);
        return;
    }

    emptyState.classList.add("hidden");
    itemsContainer.classList.remove("hidden");
    summary.classList.remove("hidden");
    toggleCheckoutButton(true);

    itemsContainer.innerHTML = "";

    let subtotalValue = 0;

    items.forEach((item) => {
        subtotalValue += item.precio * item.quantity;

        const card = document.createElement("article");
        card.className =
            "flex flex-col gap-4 rounded-2xl border border-gray/20 bg-white p-5 shadow-md sm:flex-row sm:items-center sm:justify-between";

        const hasImage = typeof item.imagenUrl === "string" && item.imagenUrl.length > 0;
        const imageContainer = document.createElement("div");
        imageContainer.className = hasImage
            ? "h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray/20 bg-white"
            : "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-gray/20 bg-primary/10 text-2xl";

        if (hasImage) {
            const img = document.createElement("img");
            img.src = item.imagenUrl!;
            img.alt = item.nombre;
            img.className = "h-full w-full object-cover";
            imageContainer.appendChild(img);
        } else {
            imageContainer.textContent = "🍽️";
        }

        const infoWrapper = document.createElement("div");
        infoWrapper.className = "flex flex-1 items-start gap-4";

        const info = document.createElement("div");
        info.className = "flex flex-col gap-2";

        const header = document.createElement("div");
        header.className = "flex items-start justify-between gap-4";

        const title = document.createElement("h3");
        title.className = "text-base font-semibold text-dark";
        title.textContent = item.nombre;
        header.appendChild(title);

        info.appendChild(header);

        if (item.descripcion) {
            const description = document.createElement("p");
            description.className = "text-xs text-dark/60";
            description.textContent = item.descripcion;
            info.appendChild(description);
        }

        const unitPrice = document.createElement("span");
        unitPrice.className = "text-sm font-semibold text-primary";
        unitPrice.textContent = `${formatCurrency(item.precio)} c/u`;
        info.appendChild(unitPrice);

        infoWrapper.append(imageContainer, info);

        const controlsWrapper = document.createElement("div");
        controlsWrapper.className =
            "flex flex-col items-end gap-3 sm:items-end sm:justify-between";

        const controls = document.createElement("div");
        controls.className = "flex items-center gap-2";

        const buttonBaseClass =
            "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60";

        const decreaseButton = document.createElement("button");
        decreaseButton.type = "button";
        decreaseButton.className = buttonBaseClass;
        decreaseButton.textContent = "−";
        decreaseButton.disabled = item.quantity <= 1;
        decreaseButton.addEventListener("click", () => {
            updateCartItemQuantity(item.id, item.quantity - 1);
            renderCartItems(getCartItems());
        });

        const quantityDisplay = document.createElement("span");
        quantityDisplay.className =
            "min-w-[3rem] rounded-lg border border-gray/30 bg-white px-3 py-1 text-center text-sm font-semibold text-dark";
        quantityDisplay.textContent = String(item.quantity);

        const increaseButton = document.createElement("button");
        increaseButton.type = "button";
        increaseButton.className = buttonBaseClass;
        increaseButton.textContent = "+";
        const maxStock = item.stock > 0 ? item.stock : Infinity;
        if (item.stock > 0) {
            increaseButton.disabled = item.quantity >= maxStock;
        }
        increaseButton.addEventListener("click", () => {
            const nextQuantity = item.stock > 0 ? Math.min(item.quantity + 1, item.stock) : item.quantity + 1;
            updateCartItemQuantity(item.id, nextQuantity);
            renderCartItems(getCartItems());
        });

        controls.append(decreaseButton, quantityDisplay, increaseButton);

        const subtotal = document.createElement("span");
        subtotal.className = "text-lg font-semibold text-primary";
        subtotal.textContent = formatCurrency(item.precio * item.quantity);

        controlsWrapper.append(controls, subtotal);

        card.append(infoWrapper, controlsWrapper);
        itemsContainer.appendChild(card);
    });

    const shippingValue = subtotalValue > 0 ? SHIPPING_FEE : 0;
    const totalValue = subtotalValue + shippingValue;

    summarySubtotal.textContent = formatCurrency(subtotalValue);
    summaryShipping.textContent = formatCurrency(shippingValue);
    summaryTotal.textContent = formatCurrency(totalValue);
    lastTotals = {
        subtotal: subtotalValue,
        shipping: shippingValue,
        total: totalValue
    };
};

const init = (): void => {
    const user = getStoredUserOrRedirect();
    setupNavBar(user);

    const cartItems = getCartItems();
    renderCartItems(cartItems);

    elements.clearButton?.addEventListener("click", () => {
        clearCart();
        renderCartItems(getCartItems());
        closeCheckoutModal();
    });

    elements.checkoutButton?.addEventListener("click", () => {
        if (elements.checkoutButton?.disabled) return;
        openCheckoutModal();
    });

    elements.checkoutModalClose?.addEventListener("click", () => {
        closeCheckoutModal();
    });

    elements.checkoutModal?.addEventListener("click", (event) => {
        if (event.target === elements.checkoutModal) {
            closeCheckoutModal();
        }
    });

    document.querySelectorAll<HTMLButtonElement>("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => {
            closeCheckoutModal();
        });
    });

    elements.checkoutForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleCheckoutSubmit();
    });
};

const handleCheckoutSubmit = async (): Promise<void> => {
    const { checkoutForm, checkoutPhone, checkoutAddress, checkoutPayment } = elements;
    
    if (!checkoutForm || !checkoutPhone || !checkoutAddress || !checkoutPayment) {
        window.alert("Error: Formulario no disponible.");
        return;
    }

    const user = getStoredUserOrRedirect();
    
    if (!user.id || !Number.isFinite(user.id)) {
        window.alert("Error: No se pudo identificar el usuario. Por favor, volvé a iniciar sesión.");
        return;
    }

    const telefono = checkoutPhone.value.trim();
    const direccion = checkoutAddress.value.trim();
    const metodoPago = checkoutPayment.value as "efectivo" | "tarjeta" | "transferencia";

    if (!telefono || !direccion || !metodoPago) {
        window.alert("Por favor, completá todos los campos obligatorios.");
        return;
    }

    const telefonoNumerico = Number(telefono.replace(/\D/g, ""));
    if (!Number.isFinite(telefonoNumerico) || telefonoNumerico <= 0) {
        window.alert("Por favor, ingresá un teléfono válido.");
        return;
    }

    const cartItems = getCartItems();
    if (cartItems.length === 0) {
        window.alert("El carrito está vacío.");
        closeCheckoutModal();
        return;
    }

    const detalles: IOrderDetailRequest[] = cartItems.map((item) => ({
        idProducto: Number(item.id),
        cantidad: item.quantity
    }));

    const orderRequest: IOrderCreateRequest = {
        idUsuario: user.id,
        telefono: telefonoNumerico,
        direccion,
        metodoPago,
        detalles
    };

    try {
        const submitButton = checkoutForm.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Procesando...";
        }

        const response = await fetch(API_ENDPOINTS.createOrder, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderRequest)
        });

        if (!response.ok) {
            let errorMessage = "No se pudo crear el pedido.";
            
            try {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorJson = await response.json();
                    errorMessage = errorJson.message || errorJson.error || JSON.stringify(errorJson);
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText;
                }
            } catch (parseError) {
                console.error("Error al parsear respuesta de error:", parseError);
            }
            
            throw new Error(errorMessage);
        }

        await response.json();

        window.alert("¡Pedido confirmado exitosamente! Podés verlo en 'Mis pedidos'.");
        
        clearCart();
        renderCartItems(getCartItems());
        closeCheckoutModal();

        setTimeout(() => {
            window.location.href = "../orders/orders.html";
        }, 500);
    } catch (error) {
        console.error("Error al crear el pedido:", error);
        const message = error instanceof Error ? error.message : "No se pudo confirmar el pedido. Intentá nuevamente.";
        window.alert(message);
    } finally {
        const submitButton = checkoutForm.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Confirmar pedido";
        }
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
