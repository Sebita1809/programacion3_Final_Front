export type CategoryOption = {
    id: number | string;
    nombre: string;
};

export type ServerProductDTO = {
    id: number | string;
    nombre: string;
    precio: number | string;
    stock: number | string;
    url?: string | null;
    descripcion?: string | null;
    categoria?: {
        id: number | string;
        nombre: string;
    } | null;
};

export type ProductRowData = {
    id: number | string;
    nombre: string;
    precio: number;
    stock: number;
    imagenUrl?: string;
    categoria: {
        id: number | string;
        nombre: string;
    } | null;
    descripcion?: string;
};
