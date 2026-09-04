import api from "./axios";

export const getVehicleList = async () => {
    const response = await api.get("/analysis/vehicles");
    return response.data;
};

export const analyzeVehicle = async (vehicleNumber) => {
    const response = await api.get(`/analysis/${vehicleNumber}`);
    return response.data;
};

export const getSuspiciousRecords = async ({ search = "", risk_level = "", limit = 100, offset = 0 } = {}) => {
    const params = {};
    if (search) params.search = search;
    if (risk_level) params.risk_level = risk_level;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await api.get("/analysis/records", { params });
    return response.data;
};

export const getAnalysisStats = async () => {
    const response = await api.get("/analysis/records/stats");
    return response.data;
};

export const syncVehicleRecords = async (limit = 50) => {
    const response = await api.post("/analysis/records/sync", null, { params: { limit } });
    return response.data;
};

export const getRecordDetail = async (vehicleNumber) => {
    const response = await api.get(`/analysis/records/detail/${vehicleNumber}`);
    return response.data;
};