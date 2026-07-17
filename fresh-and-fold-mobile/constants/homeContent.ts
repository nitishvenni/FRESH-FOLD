export type AIRecommendation = {
  id: string;
  title: string;
  accent: string;
  reason: string;
  actionLabel: string;
  actionType: "booking";
  isDemo: boolean;
};

export type ImpactMetrics = {
  waterSavedLitres: number;
  co2PreventedKg: number;
  timeSavedHours: number;
  isDemo: boolean;
};

// Real recommendation and impact sources do not exist yet. Keep demo data isolated and dev-only.
export const homeDemoContent: {
  recommendation: AIRecommendation | null;
  impact: ImpactMetrics | null;
} = __DEV__
  ? {
      recommendation: {
        id: "demo-denim-cold-wash",
        title: "Denim looks better with cold water wash.",
        accent: "Cold water wash",
        reason: "A care tip preview for the future AI recommendation service.",
        actionLabel: "Start a booking",
        actionType: "booking",
        isDemo: true,
      },
      impact: {
        waterSavedLitres: 102,
        co2PreventedKg: 48,
        timeSavedHours: 18,
        isDemo: true,
      },
    }
  : { recommendation: null, impact: null };
