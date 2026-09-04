import axiosInstance from "./axios";

export const getOverviewKPIs = async (days = 30) => {
    const response = await axiosInstance.get("/api/analytics/overview", { params: { days } });
    return response.data;
};

export const getRiskDistribution = async () => {
    const response = await axiosInstance.get("/api/analytics/risk-distribution");
    return response.data;
};

export const getRiskTrends = async (days = 30) => {
    const response = await axiosInstance.get("/api/analytics/risk-trends", { params: { days } });
    return response.data;
};

export const getRiskSignals = async () => {
    const response = await axiosInstance.get("/api/analytics/risk-signals");
    return response.data;
};

export const getSuspiciousRoutes = async (limit = 10) => {
    const response = await axiosInstance.get("/api/analytics/routes", { params: { limit } });
    return response.data;
};

export const getSuspiciousTolls = async (limit = 10) => {
    const response = await axiosInstance.get("/api/analytics/tolls", { params: { limit } });
    return response.data;
};

export const getRegionalRisk = async () => {
    const response = await axiosInstance.get("/api/analytics/regions");
    return response.data;
};

export const getRepeatRiskVehicles = async (limit = 20) => {
    const response = await axiosInstance.get("/api/analytics/repeat-risk", { params: { limit } });
    return response.data;
};

export const getInspectorWorkload = async () => {
    const response = await axiosInstance.get("/api/analytics/inspector-workload");
    return response.data;
};

export const getCostRoiMatrix = async (threshold = 0.50, costFp = 4500, costFn = 280000) => {
    const response = await axiosInstance.get("/api/analytics/cost-roi-matrix", {
        params: {
            threshold,
            cost_fp: costFp,
            cost_fn: costFn
        }
    });
    return response.data;
};

export const getExecutiveReport = async (days = 30) => {
    const response = await axiosInstance.get("/api/reports/executive", { params: { days } });
    return response.data;
};

export const getVehicleReport = async (vehicleNumber) => {
    const response = await axiosInstance.get(`/api/reports/vehicle/${vehicleNumber}`);
    return response.data;
};

export const generateAutoResponderNotice = async (vehicleNumber) => {
    const response = await axiosInstance.post(`/api/reports/auto-responder/notice/${vehicleNumber}`);
    return response.data;
};

export const getInvestigationReport = async (caseId) => {
    const response = await axiosInstance.get(`/api/reports/investigation/${caseId}`);
    return response.data;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const downloadVehiclesCSV = () => {
    window.open(`${API_BASE}/api/reports/export/vehicles-csv`, "_blank");
};

export const downloadCasesCSV = () => {
    window.open(`${API_BASE}/api/reports/export/cases-csv`, "_blank");
};
