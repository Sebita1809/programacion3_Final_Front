export interface IUser {
    id?: number;
    nombre: string;
    apellido?: string;
    email: string;
    celular?: string;
    contrasena: string;
    rol?: "USUARIO" | "ADMIN";
}
