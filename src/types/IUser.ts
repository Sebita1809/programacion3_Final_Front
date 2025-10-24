export interface IUser {
    id?: number;
    nombre: string;
    apellido?: string;
    email: string;
    celular?: number;
    contrasena: string;
    rol?: "USUARIO" | "ADMIN";
}
