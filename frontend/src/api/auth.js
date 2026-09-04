import axios from "./axios";

export const loginApi = async (credentials) => {
    const response = await axios.post("/api/auth/login", credentials);
    return response.data;
};

export const registerApi = async (userData) => {
    const response = await axios.post("/api/auth/register", userData);
    return response.data;
};

export const getMeApi = async () => {
    const response = await axios.get("/api/auth/me");
    return response.data;
};

export const logoutApi = async () => {
    const response = await axios.post("/api/auth/logout");
    return response.data;
};
