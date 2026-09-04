import axiosInstance from "./axios";

export const createInvestigationCase = async (vehicleNumber, title = null, description = null) => {
    const response = await axiosInstance.post("/api/investigations", {
        vehicle_number: vehicleNumber,
        title,
        description,
    });
    return response.data;
};

export const getInvestigationCases = async (params = {}) => {
    const response = await axiosInstance.get("/api/investigations", { params });
    return response.data;
};

export const getCaseStatistics = async () => {
    const response = await axiosInstance.get("/api/investigations/stats");
    return response.data;
};

export const getCaseDetail = async (caseId) => {
    const response = await axiosInstance.get(`/api/investigations/${caseId}`);
    return response.data;
};

export const updateCaseStatus = async (caseId, status, reason = null) => {
    const response = await axiosInstance.patch(`/api/investigations/${caseId}/status`, {
        status,
        reason,
    });
    return response.data;
};

export const assignCase = async (caseId, assignedToId) => {
    const response = await axiosInstance.patch(`/api/investigations/${caseId}/assignment`, {
        assigned_to_id: assignedToId,
    });
    return response.data;
};

export const addCaseNote = async (caseId, content) => {
    const response = await axiosInstance.post(`/api/investigations/${caseId}/notes`, {
        content,
    });
    return response.data;
};

export const reviewCaseEvidence = async (caseId, evidenceId, status, notes = null) => {
    const response = await axiosInstance.post(`/api/investigations/${caseId}/evidence-review`, {
        evidence_id: evidenceId,
        status,
        notes,
    });
    return response.data;
};

export const resolveCase = async (caseId, data) => {
    const response = await axiosInstance.post(`/api/investigations/${caseId}/resolve`, data);
    return response.data;
};

export const closeCase = async (caseId) => {
    const response = await axiosInstance.post(`/api/investigations/${caseId}/close`);
    return response.data;
};
