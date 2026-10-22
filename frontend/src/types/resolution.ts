export interface TicketSummary {
  executive_summary: string;
  key_symptoms: string[];
  troubleshooting_attempted: string[];
  business_impact: string;
  recommended_immediate_action: string;
}

export interface Citation {
  article_id?: number;
  title: string;
  category: string;
  similarity: number;
  snippet: string;
}
