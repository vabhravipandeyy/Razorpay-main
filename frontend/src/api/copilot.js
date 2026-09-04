import axiosInstance from "./axios";

export const sendCopilotMessage = async (message, vehicleNumber = null, sessionId = null) => {
    const response = await axiosInstance.post("/api/copilot/chat", {
        message,
        vehicle_number: vehicleNumber,
        session_id: sessionId,
    });
    return response.data;
};

export const getCopilotSessions = async () => {
    const response = await axiosInstance.get("/api/copilot/sessions");
    return response.data;
};

export const getSessionHistory = async (sessionId) => {
    const response = await axiosInstance.get(`/api/copilot/sessions/${sessionId}`);
    return response.data;
};

export const getCopilotHealth = async () => {
    const response = await axiosInstance.get("/api/copilot/health");
    return response.data;
};
