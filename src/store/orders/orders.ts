import { renderNavBarUserName } from "../../utils/navBarName";
import { getStoredUserOrRedirect, registerLogoutHandler } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import type { IOrder } from "../../types/IOrders";
import type { IUser } from "../../types/IUser";

const elements = {
    ordersContainer: document.getElementById("orders-container") as HTMLDivElement | null,
    emptyState: document.getElementById("orders-empty") as HTMLDivElement | null
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

const formatDate = (dateString?: string): string => {
    if (!dateString) return "Fecha no disponible";
    
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    } catch {
        return "Fecha no disponible";
    }
};

const getStatusConfig = (estado: string): { label: string; className: string } => {
    switch (estado.toLowerCase()) {
        case "pendiente":
            return {
                label: "Pendiente",
                className: "bg-yellow-100 text-yellow-800 border-yellow-300"
            };
        case "confirmado":
            return {
                label: "Confirmado",
                className: "bg-blue-100 text-blue-800 border-blue-300"
            };
        case "terminado":
            return {
                label: "Terminado",
                className: "bg-green-100 text-green-800 border-green-300"
            };
        case "cancelado":
            return {
                label: "Cancelado",
                className: "bg-red-100 text-red-800 border-red-300"
            };
        default:
            return {
                label: estado,
                className: "bg-gray-100 text-gray-800 border-gray-300"
            };
    }
};

const getPaymentMethodLabel = (metodo: string): string => {
    switch (metodo.toLowerCase()) {
        case "efectivo":
            return "Efectivo";
        case "tarjeta":
            return "Tarjeta";
        case "transferencia":
            return "Transferencia";
        default:
            return metodo;
    }
};

const renderOrders = (orders: IOrder[]): void => {
    const { ordersContainer, emptyState } = elements;

    if (!ordersContainer || !emptyState) return;

    if (orders.length === 0) {
        ordersContainer.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    ordersContainer.classList.remove("hidden");
    ordersContainer.innerHTML = "";

    // Ordenar por fecha más reciente primero (si está disponible)
    const sortedOrders = [...orders].sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    sortedOrders.forEach((order) => {
        const card = document.createElement("article");
        card.className =
            "flex flex-col gap-4 rounded-2xl border border-gray/20 bg-white p-6 shadow-md transition hover:shadow-lg";

        // Header del pedido
        const header = document.createElement("div");
        header.className = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

        const headerLeft = document.createElement("div");
        headerLeft.className = "flex flex-col gap-1";

        const orderTitle = document.createElement("h3");
        orderTitle.className = "text-lg font-semibold text-dark";
        orderTitle.textContent = `Pedido #${order.id}`;

        const orderDate = document.createElement("p");
        orderDate.className = "text-sm text-dark/60";
        orderDate.textContent = formatDate(order.fecha);

        headerLeft.append(orderTitle, orderDate);

        const statusConfig = getStatusConfig(order.estado);
        const statusBadge = document.createElement("span");
        statusBadge.className = `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`;
        statusBadge.textContent = statusConfig.label;

        header.append(headerLeft, statusBadge);

        // Información del pedido
        const infoSection = document.createElement("div");
        infoSection.className = "flex flex-col gap-2 border-t border-gray/20 pt-4";

        const deliveryInfo = document.createElement("div");
        deliveryInfo.className = "flex flex-col gap-1 text-sm";

        const addressLabel = document.createElement("span");
        addressLabel.className = "font-semibold text-dark";
        addressLabel.textContent = "Dirección de entrega:";

        const addressValue = document.createElement("span");
        addressValue.className = "text-dark/70";
        addressValue.textContent = order.direccion;

        deliveryInfo.append(addressLabel, addressValue);

        const paymentInfo = document.createElement("div");
        paymentInfo.className = "flex items-center gap-2 text-sm";

        const paymentLabel = document.createElement("span");
        paymentLabel.className = "font-semibold text-dark";
        paymentLabel.textContent = "Método de pago:";

        const paymentValue = document.createElement("span");
        paymentValue.className = "text-dark/70";
        paymentValue.textContent = getPaymentMethodLabel(order.metodoPago);

        paymentInfo.append(paymentLabel, paymentValue);

        const phoneInfo = document.createElement("div");
        phoneInfo.className = "flex items-center gap-2 text-sm";

        const phoneLabel = document.createElement("span");
        phoneLabel.className = "font-semibold text-dark";
        phoneLabel.textContent = "Teléfono:";

        const phoneValue = document.createElement("span");
        phoneValue.className = "text-dark/70";
        phoneValue.textContent = order.telefono.toString();

        phoneInfo.append(phoneLabel, phoneValue);

        infoSection.append(deliveryInfo, paymentInfo, phoneInfo);

        // Detalles de productos (si están disponibles)
        if (order.detalles && order.detalles.length > 0) {
            const productsSection = document.createElement("div");
            productsSection.className = "flex flex-col gap-2 border-t border-gray/20 pt-4";

            const productsTitle = document.createElement("h4");
            productsTitle.className = "text-sm font-semibold text-dark";
            productsTitle.textContent = "Productos:";

            productsSection.appendChild(productsTitle);

            const productsList = document.createElement("ul");
            productsList.className = "flex flex-col gap-1 text-sm text-dark/70";

            order.detalles.forEach((detalle) => {
                const productItem = document.createElement("li");
                productItem.className = "flex items-center justify-between";

                const productInfo = document.createElement("span");
                const productName = detalle.nombre || `Producto #${detalle.idProducto}`;
                productInfo.textContent = `${productName} × ${detalle.cantidad}`;

                const productPrice = document.createElement("span");
                if (detalle.precio) {
                    productPrice.className = "font-semibold text-primary";
                    productPrice.textContent = formatCurrency(detalle.precio * detalle.cantidad);
                }

                productItem.append(productInfo, productPrice);
                productsList.appendChild(productItem);
            });

            productsSection.appendChild(productsList);
            card.appendChild(productsSection);
        }

        // Footer con total
        const footer = document.createElement("div");
        footer.className = "flex items-center justify-between border-t border-gray/20 pt-4";

        const totalLabel = document.createElement("span");
        totalLabel.className = "text-base font-semibold text-dark";
        totalLabel.textContent = "Total:";

        const totalValue = document.createElement("span");
        totalValue.className = "text-xl font-bold text-primary";
        totalValue.textContent = formatCurrency(order.total);

        footer.append(totalLabel, totalValue);

        card.append(header, infoSection, footer);
        ordersContainer.appendChild(card);
    });
};

const loadOrders = async (user: IUser): Promise<void> => {
    try {
        const response = await fetch(`${API_ENDPOINTS.orders}${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Error al cargar pedidos:", response.status);
            renderOrders([]);
            return;
        }

        const orders: IOrder[] = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        renderOrders([]);
    }
};

const init = (): void => {
    const user = getStoredUserOrRedirect();
    setupNavBar(user);
    void loadOrders(user);
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
