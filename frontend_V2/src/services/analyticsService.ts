import api from './api';

export interface AnalyticsResponse {
  query: string;
  generated_sql: string;
  results: Array<Record<string, any>>;
  summary_insights: string;
  recommended_chart: string;
}

export const queryAnalytics = async (
  query: string,
  chart_type: string = 'auto'
): Promise<AnalyticsResponse> => {
  const res = await api.post<AnalyticsResponse>('/analytics', { query, chart_type });
  return res.data;
};
