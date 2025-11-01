export type CategoryRowData = {
    id: number | string;
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
};

export type CategoryPayload = {
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
};
