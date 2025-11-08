export interface IOrderDetail {
    idProducto: number;
    cantidad: number;
    nombre?: string;
    precio?: number;
}

export interface IOrderCreateRequest {
    idUsuario: number;
    telefono: string;  // String para evitar overflow de Integer en Java
    direccion: string;
    metodoPago: "efectivo" | "tarjeta" | "transferencia" | "trasferencia";
    detalles: IOrderDetail[];
}

export interface IOrder {
    id: number;
    idUsuario: number;
    telefono: number;
    direccion: string;
    metodoPago: string;
    estado: "pendiente" | "confirmado" | "cancelado" | "terminado";
    total: number;
    fecha?: string;
    detalles: IOrderDetail[];
}

export interface IOrderStatusUpdate {
    id: number;
    estado: "pendiente" | "confirmado" | "cancelado" | "terminado";
}

