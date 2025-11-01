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

export type ProductFormPayload = {
    nombre: string;
    precio: number;
    stock: number;
    descripcion?: string;
    url?: string;
    categoria: string;
};

export type ProductState = {
    editingProductId: number | string | null;
    productList: ProductRowData[];
    categories: CategoryOption[];
};
