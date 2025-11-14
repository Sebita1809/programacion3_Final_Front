import { renderNavBarUserName } from "../../utils/navBarName";
import { registerLogoutHandler, requireAdminSession } from "../../utils/auth";
import { API_ENDPOINTS } from "../../utils/api";
import type { IOrder, OrderStatus } from "../../types/IOrders";
import type { IUser } from "../../types/IUser";

const adminUser: IUser = requireAdminSession();

const roleLabel = document.getElementById("navbar-role");
const logoutButton = document.getElementById("logout-btn");
const userNameContainer = document.getElementById("navbar-user-name-container");
if (roleLabel) {
    roleLabel.textContent = adminUser.rol === "ADMIN" ? "Admin" : adminUser.rol ?? "";
}
renderNavBarUserName(userNameContainer);
registerLogoutHandler(logoutButton);

const elements = {
    list: document.getElementById("admin-orders-list") as HTMLDivElement | null,
    emptyState: document.getElementById("admin-orders-empty") as HTMLDivElement | null
};

const STATUS_OPTIONS: OrderStatus[] = ["pendiente", "confirmado", "cancelado", "terminado"];

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

const formatCurrency = (value: number): string => currencyFormatter.format(value);

const formatDate = (dateString?: string): string => {
    if (!dateString) return "Sin fecha";
    try {
        return new Intl.DateTimeFormat("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date(dateString));
    } catch {
        return dateString;
    }
};

const normalizeStatus = (value: unknown): OrderStatus => {
    const normalized = typeof value === "string" ? value.toLowerCase() : "pendiente";
    return STATUS_OPTIONS.includes(normalized as OrderStatus) ? (normalized as OrderStatus) : "pendiente";
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
        idUsuario: typeof order.idUsuario === "number" ? order.idUsuario : null,
        nombreUsuario: typeof order.nombreUsuario === "string" ? order.nombreUsuario : null,
        detalles: mapOrderDetails(order.detalles)
    };
};

const getStatusConfig = (status: OrderStatus): { label: string; className: string } => {
    switch (status) {
        case "pendiente":
            return { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
        case "confirmado":
            return { label: "Confirmado", className: "bg-blue-100 text-blue-800 border-blue-200" };
        case "cancelado":
            return { label: "Cancelado", className: "bg-red-100 text-red-800 border-red-200" };
        case "terminado":
            return { label: "Terminado", className: "bg-green-100 text-green-800 border-green-200" };
        default:
            return { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
    }
};

const state = {
    orders: [] as IOrder[],
    updating: new Set<number>(),
    deleting: new Set<number>()
};

const setUpdating = (orderId: number, updating: boolean) => {
    if (updating) {
        state.updating.add(orderId);
    } else {
        state.updating.delete(orderId);
    }
};

const setDeleting = (orderId: number, deleting: boolean) => {
    if (deleting) {
        state.deleting.add(orderId);
    } else {
        state.deleting.delete(orderId);
    }
};

const updateOrderStatus = async (orderId: number, nextStatus: OrderStatus): Promise<void> => {
    if (state.updating.has(orderId)) return;
    setUpdating(orderId, true);
    renderOrders(state.orders);
    try {
        const response = await fetch(API_ENDPOINTS.orderStatus, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: orderId, estado: nextStatus })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "No se pudo actualizar el estado.");
        }

        const target = state.orders.find((order) => order.id === orderId);
        if (target) {
            target.estado = nextStatus;
        }
        window.alert(`Pedido #${orderId} actualizado a ${nextStatus}.`);
    } catch (error) {
        console.error("No se pudo actualizar el estado:", error);
        window.alert(
            error instanceof Error ? error.message : "No se pudo actualizar el estado del pedido."
        );
    } finally {
        setUpdating(orderId, false);
        renderOrders(state.orders);
    }
};

const deleteOrder = async (orderId: number): Promise<boolean> => {
    if (state.deleting.has(orderId)) {
        return false;
    }

    setDeleting(orderId, true);
    renderOrders(state.orders);

    try {
        const response = await fetch(`${API_ENDPOINTS.orders}${orderId}/delete`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "No se pudo eliminar el pedido.");
        }

        state.orders = state.orders.filter((order) => order.id !== orderId);
        window.alert(`Pedido #${orderId} eliminado.`);
        return true;
    } catch (error) {
        console.error("No se pudo eliminar el pedido:", error);
        window.alert(error instanceof Error ? error.message : "No se pudo eliminar el pedido.");
        return false;
    } finally {
        setDeleting(orderId, false);
        renderOrders(state.orders);
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
    const { list, emptyState } = elements;
    if (!list || !emptyState) return;

    if (orders.length === 0) {
        emptyState.classList.remove("hidden");
        list.innerHTML = "";
        return;
    }

    emptyState.classList.add("hidden");
    list.innerHTML = "";

    // Ordenar por fecha más reciente primero
    const sortedOrders = [...orders].sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    sortedOrders.forEach((order) => {
        const card = document.createElement("article");
        card.className =
            "flex flex-col gap-4 rounded-2xl border border-gray/20 bg-white p-6 shadow-sm transition hover:shadow-md cursor-pointer";
        if (state.deleting.has(order.id)) {
            card.classList.add("opacity-60", "pointer-events-none");
        }

        // Header compacto con título y badge
        const header = document.createElement("div");
        header.className = "flex items-center justify-between";

        const titleSection = document.createElement("div");
        titleSection.className = "flex flex-col gap-1";
        
        const orderTitle = document.createElement("h3");
        orderTitle.className = "text-base font-semibold text-dark";
        orderTitle.textContent = `Pedido #${order.id}`;

        const clientInfo = document.createElement("p");
        clientInfo.className = "text-sm text-dark/60";
        clientInfo.textContent = `Cliente: ${order.nombreUsuario || 'Usuario desconocido'}`;

        const dateInfo = document.createElement("p");
        dateInfo.className = "text-xs text-dark/50";
        dateInfo.textContent = formatDate(order.fecha);

        titleSection.append(orderTitle, clientInfo, dateInfo);

        const statusConfig = getStatusConfig(order.estado);
        const statusBadge = document.createElement("span");
        statusBadge.className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusConfig.className}`;
        statusBadge.textContent = statusConfig.label;

        header.append(titleSection, statusBadge);

        // Resumen de productos con icono
        const productCount = document.createElement("div");
        productCount.className = "flex items-center gap-2 text-sm text-dark/70";
        const totalItems = order.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
        productCount.textContent = `${totalItems} producto(s)`;

        // Footer con total destacado
        const footer = document.createElement("div");
        footer.className = "flex items-center justify-between pt-2 border-t border-gray/10";

        const totalValue = document.createElement("span");
        totalValue.className = "text-xl font-bold text-primary";
        totalValue.textContent = formatCurrency(order.total);

        footer.append(productCount, totalValue);

        // Agregar todo al card
        card.append(header, footer);

        // Click para ver detalle (modal)
        card.addEventListener("click", () => {
            showOrderDetailModal(order);
        });

        list.appendChild(card);
    });
};

const showOrderDetailModal = (order: IOrder): void => {
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

    // Título
    const modalTitle = document.createElement("h2");
    modalTitle.className = "text-xl font-bold text-dark mb-4";
    modalTitle.textContent = `Detalle del Pedido #${order.id}`;

    // Información del cliente
    const clientSection = document.createElement("div");
    clientSection.className = "mb-4 text-sm";
    clientSection.innerHTML = `
        <div class="mb-2"><span class="font-semibold text-dark">Cliente:</span> <span class="text-dark/70">${order.nombreUsuario || 'Usuario desconocido'}</span></div>
        <div class="mb-2"><span class="font-semibold text-dark">Fecha:</span> <span class="text-dark/70">${formatDate(order.fecha)}</span></div>
        <div><span class="font-semibold text-dark">Teléfono:</span> <span class="text-dark/70">${order.telefono || 'No disponible'}</span></div>
        <div><span class="font-semibold text-dark">Dirección:</span> <span class="text-dark/70">${order.direccion || 'No especificada'}</span></div>
        <div><span class="font-semibold text-dark">Método de pago:</span> <span class="text-dark/70">${getPaymentMethodLabel(order.metodoPago)}</span></div>
    `;

    // Sección de productos
    const productsSection = document.createElement("div");
    productsSection.className = "mb-6 border-t border-gray/20 pt-4";
    
    const productsTitle = document.createElement("h3");
    productsTitle.className = "text-base font-semibold text-dark mb-3";
    productsTitle.textContent = "Productos:";
    
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

    // Sección de cambio de estado
    const stateSection = document.createElement("div");
    stateSection.className = "mb-4 pt-4 border-t border-gray/20";
    
    const stateLabel = document.createElement("label");
    stateLabel.className = "block text-sm font-semibold text-dark mb-2";
    stateLabel.textContent = "Cambiar Estado:";
    
    const stateSelect = document.createElement("select");
    stateSelect.className = "w-full rounded-xl border border-gray/40 px-4 py-2 text-sm font-medium text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3";
    
    STATUS_OPTIONS.forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        option.selected = status === order.estado;
        stateSelect.appendChild(option);
    });

    const updateBtn = document.createElement("button");
    updateBtn.type = "button";
    updateBtn.className = "w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600";
    updateBtn.textContent = "Actualizar Estado";
    
    updateBtn.addEventListener("click", async () => {
        const nextStatus = stateSelect.value as OrderStatus;
        if (nextStatus === order.estado) {
            window.alert("El pedido ya tiene ese estado.");
            return;
        }
        
        updateBtn.disabled = true;
        updateBtn.textContent = "Actualizando...";
        
        try {
            await updateOrderStatus(order.id, nextStatus);
            modal.remove();
        } catch (error) {
            updateBtn.disabled = false;
            updateBtn.textContent = "Actualizar Estado";
        }
    });

    stateSection.append(stateLabel, stateSelect, updateBtn);

    const dangerSection = document.createElement("div");
    dangerSection.className = "mt-6 border-t border-danger/20 pt-4";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
        "w-full rounded-xl border border-danger px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60";
    const isDeleting = state.deleting.has(order.id);
    deleteBtn.textContent = isDeleting ? "Eliminando..." : "Eliminar pedido";
    deleteBtn.disabled = isDeleting;
    deleteBtn.addEventListener("click", async () => {
        if (!window.confirm(`¿Deseás eliminar el pedido #${order.id}? Esta acción no se puede deshacer.`)) {
            return;
        }
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Eliminando...";
        const deleted = await deleteOrder(order.id);
        if (deleted) {
            modal.remove();
        } else {
            deleteBtn.disabled = false;
            deleteBtn.textContent = "Eliminar pedido";
        }
    });

    dangerSection.append(deleteBtn);

    // Ensamblar modal
    modalContent.append(
        closeBtn,
        modalTitle,
        clientSection,
        productsSection,
        totalsSection,
        stateSection,
        dangerSection
    );
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
};

const fetchOrders = async (): Promise<void> => {
    try {
        const response = await fetch(API_ENDPOINTS.orders, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const raw = await response.json();
        
        state.orders = Array.isArray(raw)
            ? raw
                  .map((item) => normalizeOrder(item))
                  .filter((order): order is IOrder => Boolean(order))
            : [];
        
        renderOrders(state.orders);
    } catch (error) {
        console.error("No se pudieron cargar los pedidos:", error);
        state.orders = [];
        renderOrders(state.orders);
    }
};

const init = () => {
    void fetchOrders();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
