import type { IUser } from "../../../types/IUser";

interface LoginRequest {
    email: string;
    contrasena: string;
}

const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
const emailForm = document.getElementById("email") as HTMLInputElement | null;
const contrasenaForm = document.getElementById("contrasena") as HTMLInputElement | null;

const storedUserRaw = localStorage.getItem("userData");
if (storedUserRaw) {
    try {
        const storedUser = JSON.parse(storedUserRaw) as Partial<IUser>;
        if (storedUser?.rol === "ADMIN") {
            window.location.href = "/src/admin/adminHome/adminHome.html";
        } else {
            window.location.href = "/index.html";
        }
        console.info("Sesión existente detectada. Redirigiendo automáticamente.");
    } catch {
        window.location.href = "/index.html";
    }
}

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

        const payload: LoginRequest = {
            email,
            contrasena
        };

        const url = "http://localhost:8080/auth/login";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

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

            const isAdmin =
                storedUser &&
                typeof storedUser === "object" &&
                "rol" in storedUser &&
                (storedUser as IUser).rol === "ADMIN";

            alert("Inicio de sesión exitoso.");
            if (isAdmin) {
                window.location.href = "/src/admin/adminHome/adminHome.html";
            } else {
                window.location.href = "/index.html";
            }
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "No se pudo iniciar sesión. Intenta nuevamente.";
            alert(message);
        }
    });
}
