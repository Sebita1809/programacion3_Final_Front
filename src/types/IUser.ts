export interface IUser {
    name: string;
    email: string;
    password: string;
    loggedIn?: boolean;
    role?: "USUARIO" | "ADMIN";
}
