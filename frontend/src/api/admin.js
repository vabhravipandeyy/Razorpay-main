import axiosInstance from "./axios";

export const getAdminOverview = async () => {
    const response = await axiosInstance.get("/api/admin/overview");
    return response.data;
};

export const getAdminUsers = async (search = "", role = "") => {
    const params = {};
    if (search) params.search = search;
    if (role) params.role = role;
    const response = await axiosInstance.get("/api/admin/users", { params });
    return response.data;
};

export const createAdminUser = async (userData) => {
    const response = await axiosInstance.post("/api/admin/users", userData);
    return response.data;
};

export const updateUserStatus = async (userId, isActive) => {
    const response = await axiosInstance.patch(`/api/admin/users/${userId}/status`, {
        is_active: isActive
    });
    return response.data;
};

export const updateUserRole = async (userId, role) => {
    const response = await axiosInstance.patch(`/api/admin/users/${userId}/role`, {
        role
    });
    return response.data;
};

export const getAuditLogs = async (params = {}) => {
    const response = await axiosInstance.get("/api/admin/audit-logs", { params });
    return response.data;
};

export const getSystemHealth = async () => {
    const response = await axiosInstance.get("/api/admin/system");
    return response.data;
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const response = await axiosInstance.post("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
    });
    return response.data;
};

export const triggerMLTraining = async (nEstimators = 100, contamination = 0.10) => {
    const response = await axiosInstance.post(`/analysis/ml/train?n_estimators=${nEstimators}&contamination=${contamination}`);
    return response.data;
};

export const triggerBatchSync = async (limit = 100) => {
    const response = await axiosInstance.post(`/analysis/records/sync?limit=${limit}`);
    return response.data;
};
