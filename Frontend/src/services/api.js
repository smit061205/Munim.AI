import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api";

// Create basic axios instance without auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized access - redirecting to login");
    }
    return Promise.reject(error);
  }
);

// Helper function to create authenticated API client
export const createAuthenticatedApi = (getToken) => {
  const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  authApi.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    return config;
  });

  return authApi;
};

// System endpoints
export const fetchHealth = () => api.get("/health");
export const fetchStatus = () => api.get("/status");

// Financial data endpoints
export const fetchAssets = (authApi) => authApi.get("/data/assets");
export const fetchLiabilities = (authApi) => authApi.get("/data/liabilities");
export const fetchTransactions = (authApi) => authApi.get("/data/transactions");
export const fetchEPF = (authApi) => authApi.get("/data/epf");
export const fetchCreditScore = (authApi) => authApi.get("/data/credit-score");
export const fetchInvestments = (authApi) => authApi.get("/data/investments");

// Dashboard analytics endpoints
export const fetchDashboard = async (authApi, categories = []) => {
  console.log(
    "🎯 API Service: fetchDashboard called with categories:",
    categories
  );

  const response = await authApi.get("/dashboard/", {
    params: { categories: categories.join(",") },
  });

  console.log("📊 API Service: Dashboard response:", {
    status: response.status,
    data: response.data,
    dataType: typeof response.data,
    dataKeys: response.data ? Object.keys(response.data) : null,
  });

  return response;
};

export const fetchMonthlySpending = async (authApi, categories = []) => {
  console.log(
    "📅 API Service: fetchMonthlySpending called with categories:",
    categories
  );

  const response = await authApi.get("/dashboard/monthly-spending", {
    params: { categories: categories.join(",") },
  });

  console.log("📈 API Service: Monthly spending response:", response.data);
  return response;
};

export const fetchAssetLiability = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/dashboard/asset-liability", { params });
};

export const fetchEPFContributions = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/dashboard/epf-contributions", { params });
};

export const fetchCreditScoreHistory = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/dashboard/credit-score", { params });
};

export const fetchNetWorthTimeline = async (authApi, categories = []) => {
  console.log(
    "💰 API Service: fetchNetWorthTimeline called with categories:",
    categories
  );

  const response = await authApi.get("/dashboard/net-worth", {
    params: { categories: categories.join(",") },
  });

  console.log("📊 API Service: Net worth response:", response.data);
  return response;
};

export const fetchSpendingCategories = async (authApi, categories = []) => {
  console.log(
    "🏷️ API Service: fetchSpendingCategories called with categories:",
    categories
  );

  const response = await authApi.get("/dashboard/spending-categories", {
    params: { categories: categories.join(",") },
  });

  console.log("📋 API Service: Spending categories response:", response.data);
  return response;
};

export const refreshDashboard = (authApi, allowedCategories) =>
  authApi.post("/dashboard/refresh", { allowedCategories });

// Advanced analytics endpoints
export const fetchExpenseTrends = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/expense-trends", { params });
};

export const fetchSavingsForecast = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/savings-forecast", { params });
};

export const fetchInvestmentComposition = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/investment-composition", { params });
};

export const fetchFinancialHealth = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/financial-health", { params });
};

export const fetchCashFlow = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/cash-flow", { params });
};

export const fetchAnalyticsSummary = (authApi, categories = []) => {
  const params =
    categories.length > 0 ? { categories: categories.join(",") } : {};
  return authApi.get("/analytics/summary", { params });
};

export const fetchCategoryFilteredAnalytics = (
  authApi,
  allowedCategories,
  analysisType
) =>
  authApi.post("/analytics/category-filter", {
    allowedCategories,
    analysisType,
  });

// Permissions endpoints
export const fetchPermissions = (authApi) => authApi.get("/permissions");
export const updatePermissions = (authApi, categories) =>
  authApi.post("/permissions", { categories });

// AI Query endpoint
export const sendQuery = (authApi, question, allowedCategories) =>
  authApi.post("/query", { question, allowedCategories });

// Helper function to fetch all allowed data
export const fetchAllowedData = async (authApi, allowedCategories) => {
  const promises = [];
  const data = {};

  if (allowedCategories.includes("assets")) {
    promises.push(
      fetchAssets(authApi)
        .then((res) => (data.assets = res.data))
        .catch((err) => {
          console.error("Error fetching assets:", err);
          data.assets = [];
        })
    );
  }
  if (allowedCategories.includes("liabilities")) {
    promises.push(
      fetchLiabilities(authApi)
        .then((res) => (data.liabilities = res.data))
        .catch((err) => {
          console.error("Error fetching liabilities:", err);
          data.liabilities = [];
        })
    );
  }
  if (allowedCategories.includes("transactions")) {
    promises.push(
      fetchTransactions(authApi)
        .then((res) => (data.transactions = res.data))
        .catch((err) => {
          console.error("Error fetching transactions:", err);
          data.transactions = [];
        })
    );
  }
  if (allowedCategories.includes("epf")) {
    promises.push(
      fetchEPF(authApi)
        .then((res) => (data.epf = res.data))
        .catch((err) => {
          console.error("Error fetching EPF:", err);
          data.epf = [];
        })
    );
  }
  if (allowedCategories.includes("creditScore")) {
    promises.push(
      fetchCreditScore(authApi)
        .then((res) => (data.creditScore = res.data))
        .catch((err) => {
          console.error("Error fetching credit score:", err);
          data.creditScore = [];
        })
    );
  }
  if (allowedCategories.includes("investments")) {
    promises.push(
      fetchInvestments(authApi)
        .then((res) => (data.investments = res.data))
        .catch((err) => {
          console.error("Error fetching investments:", err);
          data.investments = [];
        })
    );
  }

  await Promise.allSettled(promises);
  return data;
};

export default api;
