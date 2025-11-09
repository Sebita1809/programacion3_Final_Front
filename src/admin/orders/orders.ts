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
    updating: new Set<number>()
};

const setUpdating = (orderId: number, updating: boolean) => {
    if (updating) {
        state.updating.add(orderId);
    } else {
        state.updating.delete(orderId);
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

    orders.forEach((order) => {
        const card = document.createElement("article");
        card.className =
            "flex flex-col gap-4 rounded-2xl border border-gray/30 bg-white p-6 shadow-sm";

        const header = document.createElement("div");
        header.className = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

        const title = document.createElement("div");
        title.className = "flex flex-col";
        const heading = document.createElement("h3");
        heading.className = "text-lg font-semibold text-dark";
        heading.textContent = `Pedido #${order.id}`;
        const date = document.createElement("span");
        date.className = "text-sm text-dark/60";
        date.textContent = formatDate(order.fecha);
        title.append(heading, date);

        const badgeConfig = getStatusConfig(order.estado);
        const badge = document.createElement("span");
        badge.className = `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeConfig.className}`;
        badge.textContent = badgeConfig.label;

        header.append(title, badge);

        const info = document.createElement("div");
        info.className = "grid gap-2 border-t border-gray/20 pt-4 text-sm text-dark/70";
        info.innerHTML = `
            <div><span class="font-semibold text-dark">Dirección:</span> ${order.direccion ?? "Sin datos"}</div>
            <div><span class="font-semibold text-dark">Teléfono:</span> ${order.telefono ?? "No disponible"}</div>
            <div><span class="font-semibold text-dark">Pago:</span> ${order.metodoPago ?? "No indicado"}</div>
        `;

        const detailsWrapper = document.createElement("div");
        detailsWrapper.className = "flex flex-col gap-2 border-t border-gray/20 pt-4";
        if (order.detalles.length > 0) {
            const detailTitle = document.createElement("h4");
            detailTitle.className = "text-sm font-semibold text-dark";
            detailTitle.textContent = "Productos";
            detailsWrapper.append(detailTitle);

            const listEl = document.createElement("ul");
            listEl.className = "flex flex-col gap-1 text-sm text-dark/70";
            order.detalles.forEach((detalle) => {
                const item = document.createElement("li");
                item.className = "flex items-center justify-between";
                const label = document.createElement("span");
                label.textContent = `${detalle.producto ?? "Producto"} × ${detalle.cantidad}`;
                const price = document.createElement("span");
                if (typeof detalle.subtotal === "number") {
                    price.className = "font-semibold text-primary";
                    price.textContent = formatCurrency(detalle.subtotal);
                } else {
                    price.textContent = "—";
                }
                item.append(label, price);
                listEl.appendChild(item);
            });
            detailsWrapper.append(listEl);
        } else {
            const emptyDetails = document.createElement("p");
            emptyDetails.className = "text-sm text-dark/50";
            emptyDetails.textContent = "Este pedido no tiene detalles cargados.";
            detailsWrapper.append(emptyDetails);
        }

        const footer = document.createElement("div");
        footer.className =
            "flex flex-col gap-3 border-t border-gray/20 pt-4 sm:flex-row sm:items-center sm:justify-between";

        const totalLabel = document.createElement("span");
        totalLabel.className = "text-xl font-bold text-primary";
        totalLabel.textContent = `Total: ${formatCurrency(order.total)}`;

        const controls = document.createElement("div");
        controls.className = "flex flex-col gap-2 sm:flex-row sm:items-center";

        const select = document.createElement("select");
        select.className =
            "rounded-xl border border-gray/40 px-4 py-2 text-sm font-medium text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
        STATUS_OPTIONS.forEach((status) => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            option.selected = status === order.estado;
            select.appendChild(option);
        });
        select.disabled = state.updating.has(order.id);

        const updateBtn = document.createElement("button");
        updateBtn.type = "button";
        updateBtn.className =
            "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60";
        updateBtn.textContent = "Actualizar estado";
        updateBtn.disabled = state.updating.has(order.id);

        updateBtn.addEventListener("click", () => {
            const nextStatus = select.value as OrderStatus;
            if (nextStatus === order.estado) {
                window.alert("El pedido ya tiene ese estado.");
                return;
            }
            updateOrderStatus(order.id, nextStatus);
        });

        controls.append(select, updateBtn);
        footer.append(totalLabel, controls);

        card.append(header, info, detailsWrapper, footer);
        list.appendChild(card);
    });
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
        window.alert("No se pudieron cargar los pedidos. Verificá el servidor.");
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
