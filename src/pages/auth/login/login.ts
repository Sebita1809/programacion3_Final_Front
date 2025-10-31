import type { LoginRequest } from "../../../types/LoginRequest";
import type { IUser } from "../../../types/IUser";
import { navigateByStoredSession, navigateToHomeByRole } from "../../../utils/navigate";

const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
const emailForm = document.getElementById("email") as HTMLInputElement | null;
const contrasenaForm = document.getElementById("contrasena") as HTMLInputElement | null;

navigateByStoredSession();

if (!loginForm || !emailForm || !contrasenaForm) {
    console.warn("Formulario de login no encontrado en el DOM.");
} else {
    loginForm.addEventListener("submit", async (event: SubmitEvent) => {
        event.preventDefault();
        const email = emailForm.value.trim();
        const contrasena = contrasenaForm.value;

        if (!email || !contrasena) {
            alert("Por favor, complete todos los campos");
            return;
        }

        //Se crea objeto payload para el login y que quede mas limpio el codigo
        const payload: LoginRequest = {
            email,
            contrasena
        };

        //Pasar a variable de entorno
        const url = "http://localhost:8080/auth/login";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
//comentario
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Credenciales inválidas");
            }

            let data: IUser | null = null;
            try {
                data = await response.json();
            } catch (parseError) {
                console.warn("Respuesta sin cuerpo JSON al iniciar sesión:", parseError);
            }

            const storedUser = data ?? { email };
            localStorage.setItem("userData", JSON.stringify(storedUser));

            alert("Inicio de sesión exitoso.");
            navigateToHomeByRole(storedUser);
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "No se pudo iniciar sesión. Intenta nuevamente.";
            alert(message);
        }
    });
}
