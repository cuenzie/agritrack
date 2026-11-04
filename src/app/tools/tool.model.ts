export type ToolCondition = 'Excellent' | 'Good' | 'Needs attention';

export interface AgricultureTool {
  id: string;
  name: string;
  category: string;
  brand: string;
  location: string;
  condition: ToolCondition;
  lastMaintenance: string;
  purchaseDate: string;
  notes: string;
  createdAt?: number;
}

export type AgricultureToolDraft = Omit<AgricultureTool, 'id' | 'createdAt'>;
