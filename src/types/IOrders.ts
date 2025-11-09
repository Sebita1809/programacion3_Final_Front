export type OrderStatus = "pendiente" | "confirmado" | "cancelado" | "terminado";

export interface IOrderDetailRequest {
    idProducto: number;
    cantidad: number;
}

export interface IOrderDetail {
    producto?: string;
    cantidad: number;
    subtotal?: number;
    idProducto?: number;
}

export interface IOrderCreateRequest {
    idUsuario: number;
    telefono: number;
    direccion: string;
    metodoPago: "efectivo" | "tarjeta" | "transferencia";
    detalles: IOrderDetailRequest[];
}

export interface IOrder {
    id: number;
    fecha?: string;
    estado: OrderStatus;
    direccion: string | null;
    telefono: number | null;
    metodoPago: string | null;
    total: number;
    detalles: IOrderDetail[];
}

export interface IOrderStatusUpdate {
    id: number;
    estado: OrderStatus;
}
