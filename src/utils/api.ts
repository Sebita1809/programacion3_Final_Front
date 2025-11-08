const DEFAULT_API_BASE_URL = "http://localhost:8080";

const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

const resolveBaseUrl = (): string => {
    const envValue = import.meta.env?.VITE_API_BASE_URL;
    if (typeof envValue === "string" && envValue.trim() !== "") {
        return trimTrailingSlash(envValue.trim());
    }

    return DEFAULT_API_BASE_URL;
};

const buildUrl = (path: string): string => {
    const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${sanitizedPath}`.replace(/([^:]\/)\/+/g, "$1");
};

export const API_BASE_URL = resolveBaseUrl();

export const API_ENDPOINTS = {
    orders: buildUrl("/order/"),
    createOrder: buildUrl("/order/create"),
    orderStatus: buildUrl("/order/status"),
    products: buildUrl("/product/"),
    categories: buildUrl("/category/"),
    createProduct: buildUrl("/product/create")
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
