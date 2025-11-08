export interface IProductCategory {
    id: number;
    nombre: string;
}

export interface IProduct {
    id: number;
    nombre: string;
    precio: number;
    stock: number;
    descripcion?: string;
    imagenUrl?: string;
    categoria?: IProductCategory | null;
}
