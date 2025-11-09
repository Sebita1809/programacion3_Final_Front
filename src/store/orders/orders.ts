import { renderNavBarUserName } from "../../utils/navBarName";
import { getStoredUserOrRedirect, registerLogoutHandler } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import type { IOrder, OrderStatus } from "../../types/IOrders";
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

const ORDER_STATUS_VALUES: OrderStatus[] = ["pendiente", "confirmado", "cancelado", "terminado"];

const normalizeStatus = (status: unknown): OrderStatus => {
    const normalized = typeof status === "string" ? status.toLowerCase() : "pendiente";
    if (ORDER_STATUS_VALUES.includes(normalized as OrderStatus)) {
        return normalized as OrderStatus;
    }
    return "pendiente";
};

const mapOrderDetails = (detalles: unknown): IOrder["detalles"] => {
    if (!Array.isArray(detalles)) return [];
    const parsed: IOrder["detalles"] = [];
    detalles.forEach((detalle) => {
        if (!detalle || typeof detalle !== "object") return;
        const data = detalle as Record<string, unknown>;
        const cantidad = Number(data.cantidad);
        parsed.push({
            producto: typeof data.producto === "string" ? data.producto : undefined,
            cantidad: Number.isFinite(cantidad) ? cantidad : 0,
            subtotal: typeof data.subtotal === "number" ? data.subtotal : undefined
        });
    });
    return parsed;
};

const normalizeOrder = (raw: unknown): IOrder | null => {
    if (!raw || typeof raw !== "object") return null;
    const order = raw as Record<string, unknown>;
    const total = Number(order.total);

    return {
        id: Number(order.id) || 0,
        fecha: typeof order.fecha === "string" ? order.fecha : undefined,
        estado: normalizeStatus(order.estado),
        direccion: typeof order.direccion === "string" ? order.direccion : null,
        telefono: typeof order.telefono === "number" ? order.telefono : null,
        metodoPago: typeof order.metodoPago === "string" ? order.metodoPago : null,
        total: Number.isFinite(total) ? total : 0,
        detalles: mapOrderDetails(order.detalles)
    };
};

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

const getPaymentMethodLabel = (metodo?: string | null): string => {
    if (!metodo) return "No indicado";
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

    // Ordenar por fecha más reciente primero
    const sortedOrders = [...orders].sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    sortedOrders.forEach((order) => {
        const card = document.createElement("article");
        card.className =
            "flex flex-col gap-4 rounded-2xl border border-gray/20 bg-white p-6 shadow-sm transition hover:shadow-md cursor-pointer";

        // Header compacto con título y badge
        const header = document.createElement("div");
        header.className = "flex items-center justify-between";

        const orderTitle = document.createElement("h3");
        orderTitle.className = "text-base font-semibold text-dark";
        orderTitle.textContent = `Pedido #${order.id}`;

        const statusConfig = getStatusConfig(order.estado);
        const statusBadge = document.createElement("span");
        statusBadge.className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusConfig.className}`;
        statusBadge.textContent = statusConfig.label;

        header.append(orderTitle, statusBadge);

        // Fecha con icono
        const dateSection = document.createElement("div");
        dateSection.className = "flex items-center gap-2 text-sm text-dark/60";
        dateSection.innerHTML = `🗓️ ${formatDate(order.fecha)}`;

        // Lista compacta de productos
        const productsPreview = document.createElement("div");
        productsPreview.className = "text-sm text-dark/70";
        
        if (order.detalles && order.detalles.length > 0) {
            const productSummary = order.detalles
                .map(d => `• ${d.producto || 'Producto'} (x${d.cantidad})`)
                .join('\n');
            productsPreview.textContent = productSummary;
            productsPreview.style.whiteSpace = 'pre-line';
        } else {
            productsPreview.textContent = "Sin detalles de productos";
        }

        // Resumen de productos con icono
        const productCount = document.createElement("div");
        productCount.className = "flex items-center gap-2 text-sm text-dark/70";
        const totalItems = order.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
        productCount.innerHTML = `📦 ${totalItems} producto(s)`;

        // Footer con total destacado
        const footer = document.createElement("div");
        footer.className = "flex items-center justify-between pt-2 border-t border-gray/10";

        const totalLabel = document.createElement("span");
        totalLabel.className = "text-sm font-medium text-dark/70";
        totalLabel.textContent = "Total";

        const totalValue = document.createElement("span");
        totalValue.className = "text-xl font-bold text-primary";
        totalValue.textContent = formatCurrency(order.total);

        footer.append(totalLabel, totalValue);

        // Agregar todo al card
        card.append(header, dateSection, productsPreview, productCount, footer);

        // Click para ver detalle (modal)
        card.addEventListener("click", () => {
            showOrderDetail(order);
        });

        ordersContainer.appendChild(card);
    });
};

const showOrderDetail = (order: IOrder): void => {
    // Crear modal
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-dark/30 px-4";
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Contenido del modal
    const modalContent = document.createElement("div");
    modalContent.className = "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-lg";

    // Botón cerrar
    const closeBtn = document.createElement("button");
    closeBtn.className = "absolute right-4 top-4 text-2xl font-bold text-dark/60 transition hover:text-dark";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => modal.remove());

    // Badge de estado
    const statusConfig = getStatusConfig(order.estado);
    const statusBadge = document.createElement("div");
    statusBadge.className = `inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold uppercase mb-4 ${statusConfig.className}`;
    statusBadge.textContent = statusConfig.label;

    // Fecha
    const dateInfo = document.createElement("p");
    dateInfo.className = "text-sm text-dark/60 mb-6 flex items-center gap-2";
    dateInfo.innerHTML = `🗓️ ${formatDate(order.fecha)}`;

    // Sección de información de entrega
    const deliverySection = document.createElement("div");
    deliverySection.className = "mb-6";
    deliverySection.innerHTML = `
        <h3 class="text-base font-semibold text-dark mb-3 flex items-center gap-2">
            📍 Información de Entrega
        </h3>
        <div class="space-y-2 text-sm">
            <div><span class="font-semibold text-dark">Dirección:</span> <span class="text-dark/70">${order.direccion || 'No especificada'}</span></div>
            <div><span class="font-semibold text-dark">Teléfono:</span> <span class="text-dark/70">${order.telefono || 'No disponible'}</span></div>
            <div><span class="font-semibold text-dark">Método de pago:</span> <span class="text-dark/70">💵 ${getPaymentMethodLabel(order.metodoPago)}</span></div>
        </div>
    `;

    // Sección de productos
    const productsSection = document.createElement("div");
    productsSection.className = "mb-6";
    
    const productsTitle = document.createElement("h3");
    productsTitle.className = "text-base font-semibold text-dark mb-3 flex items-center gap-2";
    productsTitle.innerHTML = "🛍️ Productos";
    
    productsSection.appendChild(productsTitle);

    if (order.detalles && order.detalles.length > 0) {
        order.detalles.forEach((detalle) => {
            const productRow = document.createElement("div");
            productRow.className = "flex items-center justify-between py-2 text-sm border-b border-gray/10";
            
            const productInfo = document.createElement("div");
            productInfo.className = "flex-1";
            productInfo.innerHTML = `
                <div class="font-medium text-dark">${detalle.producto || 'Producto'}</div>
                <div class="text-xs text-dark/60">Cantidad: ${detalle.cantidad} × ${formatCurrency((detalle.subtotal || 0) / detalle.cantidad)}</div>
            `;
            
            const productPrice = document.createElement("div");
            productPrice.className = "font-semibold text-primary";
            productPrice.textContent = formatCurrency(detalle.subtotal || 0);
            
            productRow.append(productInfo, productPrice);
            productsSection.appendChild(productRow);
        });
    }

    // Resumen de totales
    const subtotal = order.total - 500;
    const shipping = 500;
    
    const totalsSection = document.createElement("div");
    totalsSection.className = "space-y-2 mb-6 pt-4 border-t border-gray/20";
    totalsSection.innerHTML = `
        <div class="flex justify-between text-sm">
            <span class="text-dark/70">Subtotal:</span>
            <span class="font-medium text-dark">${formatCurrency(subtotal)}</span>
        </div>
        <div class="flex justify-between text-sm">
            <span class="text-dark/70">Envío:</span>
            <span class="font-medium text-dark">${formatCurrency(shipping)}</span>
        </div>
        <div class="flex justify-between text-lg font-bold pt-2 border-t border-gray/20">
            <span class="text-primary">Total:</span>
            <span class="text-primary">${formatCurrency(order.total)}</span>
        </div>
    `;

    // Mensaje de estado
    const statusMessage = document.createElement("div");
    statusMessage.className = "rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm";
    statusMessage.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-xl">⏳</span>
            <div>
                <div class="font-semibold text-yellow-800 mb-1">Tu pedido está siendo procesado</div>
                <div class="text-yellow-700 text-xs">Te notificaremos cuando esté listo para entrega.</div>
            </div>
        </div>
    `;

    // Ensamblar modal
    modalContent.append(
        closeBtn,
        statusBadge,
        dateInfo,
        deliverySection,
        productsSection,
        totalsSection,
        statusMessage
    );
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
};

const loadOrders = async (user: IUser): Promise<void> => {
    try {
        const response = await fetch(`${API_ENDPOINTS.orders}${user.id}/`, {
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

        const raw = await response.json();
        const orders = Array.isArray(raw)
            ? raw
                  .map((item) => normalizeOrder(item))
                  .filter((order): order is IOrder => Boolean(order))
            : [];
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
