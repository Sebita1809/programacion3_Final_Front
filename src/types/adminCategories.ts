export type ServerCategoryDTO = {
    id: number | string;
    nombre: string;
    descripcion: string;
    url?: string | null;
    imagenUrl?: string | null;
};

export type CategoryRowData = {
    id: number | string;
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
};

export type CategoryPayload = {
    nombre: string;
    descripcion: string;
    url: string;
};
