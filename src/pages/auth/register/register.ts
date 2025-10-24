import type { IUser } from "../../../types/IUser";

const registerForm = document.getElementById("register-form") as HTMLFormElement | null;
const nombreForm = document.getElementById("nombre") as HTMLInputElement | null;
const emailForm = document.getElementById("email") as HTMLInputElement | null;
const contrasenaForm = document.getElementById("contrasena") as HTMLInputElement | null;

if (registerForm && nombreForm && emailForm && contrasenaForm) {
    registerForm.addEventListener("submit", async (e: SubmitEvent) => {
        e.preventDefault();
        const nombre = nombreForm.value.trim();
        const email = emailForm.value.trim();
        const contrasena = contrasenaForm.value;

        if (!nombre || !email || !contrasena) {
            alert("Por favor, complete todos los campos");
            return;
        }

        const user: IUser = {
            nombre,
            email,
            contrasena
        };
        
        const url = "http://localhost:8080/auth/register";
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Error al registrar usuario");
            }

            let data: unknown = null;
            try {
                data = await response.json();
            } catch (parseError) {
                console.warn("Respuesta sin cuerpo JSON:", parseError);
            }
            console.log("Usuario registrado:", data);
            alert("Registro exitoso. ¡Bienvenido a SuperFood!");
            registerForm.reset();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "No se pudo registrar. Intenta nuevamente.";
            alert(message);
        }
    });
} else {
    console.warn("Formulario de registro no encontrado en el DOM.");
}
