export interface FormData {
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  scheduleDate: string;
  specialInstructions: string;
}

export interface BudgetHint {
  min: number;
  max: number;
  midpoint: number;
  note: string;
}

export interface RecommendedProvider {
  providerId: string;
  name: string;
  avatar?: string;
  avgRating: number;
  completedJobCount: number;
  reason: string;
}
