const normalizeText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export type SupportIntent =
  | "greeting"
  | "order_status"
  | "delivery_charge"
  | "timings"
  | "services"
  | "washing_timeline"
  | "place_order"
  | "unknown";

export type IntentDetectionResult = {
  intent: SupportIntent;
  confidenceScore: number;
};

export type SupportContext = {
  mobile: string;
  latestOrder: {
    status: string;
    createdAt: Date;
  } | null;
  nextStep: string | null;
  servicesList: string;
  pricingRule: string;
  deliveryPolicy: string;
  workingHours: string;
  serviceTurnaround: {
    wash: string;
    dry: string;
    express: string;
  };
};

type EscalationMatcher = {
  pattern: RegExp;
  reason: string;
};

export const SUPPORT_PROMPT_POLICY = {
  version: "v1",
  brandVoice: "Professional, calm, concise, and operationally precise.",
  allowedAnswerIntents: [
    "greeting",
    "order_status",
    "delivery_charge",
    "timings",
    "services",
    "washing_timeline",
    "place_order",
  ] as const,
  escalationMatchers: [
    { pattern: /\brefund|money back|return money\b/, reason: "Refund request" },
    {
      pattern: /\bpayment failed|payment failure|transaction failed|charged twice|upi failed\b/,
      reason: "Payment failure",
    },
    { pattern: /\bcomplaint|complain|issue\b/, reason: "Complaint" },
    {
      pattern: /\bdamaged|damage|torn|stain|lost cloth|missing cloth\b/,
      reason: "Damaged or missing clothes",
    },
    { pattern: /\bcancel|cancellation\b/, reason: "Cancellation request after processing" },
    {
      pattern: /\bangry|furious|worst|terrible|frustrated|not happy|bad service|scam\b/,
      reason: "Customer frustration detected",
    },
    {
      pattern:
        /\braise (a )?(request|ticket|complaint)|register (a )?(complaint|ticket)|talk to (agent|human|support)|connect (me )?to (agent|support|human)|human support|support team|customer care|representative\b/,
      reason: "User requested human support",
    },
  ] as EscalationMatcher[],
} as const;

export const buildSystemPrompt = () => {
  return [
    "You are Fresh & Fold Support Assistant.",
    `Brand voice: ${SUPPORT_PROMPT_POLICY.brandVoice}`,
    `Allowed intents: ${SUPPORT_PROMPT_POLICY.allowedAnswerIntents.join(", ")}`,
    "If user asks for refund/payment failure/complaints/damage/cancellation/angry sentiment: respond exactly with ESCALATE_TO_AGENT.",
    "Never answer outside allowed intents.",
    "Use available account and latest-order context for every answer.",
  ].join(" ");
};

export const detectSupportIntent = (message: string): SupportIntent => {
  const lower = normalizeText(message);

  if (/\bhi|hello|hey|good morning|good afternoon|good evening|thanks|thank you\b/.test(lower)) {
    return "greeting";
  }

  if (
    /\bwhere|status|track|latest order|order update|my order|order (is|has)|when (will|can) (it|order)|delivered|delivery update|out for delivery|not delivered|isnot delivered\b/.test(
      lower
    )
  ) {
    return "order_status";
  }
  if (/\bdelivery charge|delivery fee|shipping|delivery cost|delivery price|charge for delivery|how much delivery\b/.test(lower)) {
    return "delivery_charge";
  }
  if (/\btiming|timings|time|hours|open|close|working hour|working hours\b/.test(lower)) {
    return "timings";
  }
  if (/\bservices|service type|what do you provide|offer|what all services|which services\b/.test(lower)) {
    return "services";
  }
  if (/\bhow long|washing take|turnaround|delivery time|ready in|eta|by when|how many hours\b/.test(lower)) {
    return "washing_timeline";
  }
  if (/\bhow to place|place order|book order|create order|schedule pickup|how can i order|steps to order\b/.test(lower)) {
    return "place_order";
  }

  return "unknown";
};

export const detectSupportIntentWithConfidence = (message: string): IntentDetectionResult => {
  const lower = normalizeText(message);

  if (
    /\bhi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|how are you|how r u|whats up|what's up\b/.test(
      lower
    )
  ) {
    return { intent: "greeting", confidenceScore: 0.95 };
  }

  const intentPatternMap: Array<{ intent: SupportIntent; patterns: RegExp[] }> = [
    {
      intent: "order_status",
      patterns: [
        /\bwhere|status|track|latest order|order update|my order|when (will|can) (it|order)|delivered|delivery update|out for delivery|not delivered|isnot delivered\b/,
      ],
    },
    {
      intent: "delivery_charge",
      patterns: [/\bdelivery charge|delivery fee|shipping|delivery cost|delivery price|how much delivery\b/],
    },
    {
      intent: "timings",
      patterns: [/\btiming|timings|time|hours|open|close|working hour|working hours\b/],
    },
    {
      intent: "services",
      patterns: [/\bservices|service type|what do you provide|offer|what all services|which services\b/],
    },
    {
      intent: "washing_timeline",
      patterns: [/\bhow long|washing take|turnaround|delivery time|ready in|eta|by when|how many hours\b/],
    },
    {
      intent: "place_order",
      patterns: [/\bhow to place|place order|book order|create order|schedule pickup|how can i order|steps to order\b/],
    },
  ];

  let bestIntent: SupportIntent = "unknown";
  let bestMatchScore = 0;

  for (const entry of intentPatternMap) {
    const matchCount = entry.patterns.reduce((count, pattern) => {
      return count + (pattern.test(lower) ? 1 : 0);
    }, 0);

    if (matchCount > bestMatchScore) {
      bestMatchScore = matchCount;
      bestIntent = entry.intent;
    }
  }

  if (bestIntent === "unknown") {
    return { intent: "unknown", confidenceScore: 0.35 };
  }

  const confidenceScore = Math.min(0.75 + bestMatchScore * 0.15, 0.98);
  return { intent: bestIntent, confidenceScore };
};

export const detectEscalation = (message: string): { escalate: boolean; reason: string } => {
  const lower = normalizeText(message);
  for (const matcher of SUPPORT_PROMPT_POLICY.escalationMatchers) {
    if (matcher.pattern.test(lower)) {
      return { escalate: true, reason: matcher.reason };
    }
  }
  return { escalate: false, reason: "" };
};

const formatOrderDate = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

export const buildControlledSupportReply = (
  intent: SupportIntent,
  context: SupportContext
): string => {
  if (intent === "greeting") {
    return "Hello. I can help with order status, delivery charges, timings, services, washing timeline, and placing an order. If you need a human agent, say connect support team.";
  }

  if (intent === "order_status") {
    if (!context.latestOrder) {
      return "I could not find an active order for your number. You can place a new order from Home > Schedule Pickup.";
    }

    const orderDate = formatOrderDate(context.latestOrder.createdAt);
    const progression = context.nextStep ? ` and will move to ${context.nextStep} next.` : ".";
    return `For mobile ${context.mobile}, your latest order placed on ${orderDate} is currently in ${context.latestOrder.status} stage${progression}`;
  }

  if (intent === "delivery_charge") {
    return `${context.deliveryPolicy} Your current pricing rules are: ${context.pricingRule}`;
  }

  if (intent === "timings") {
    return `Our operating timings are ${context.workingHours} Pickup and delivery slots are available within these timings.`;
  }

  if (intent === "services") {
    return `We currently provide ${context.servicesList}. ${context.pricingRule}`;
  }

  if (intent === "washing_timeline") {
    return `Typical turnaround is: Wash (${context.serviceTurnaround.wash}), Dry Clean (${context.serviceTurnaround.dry}), Express (${context.serviceTurnaround.express}).`;
  }

  if (intent === "place_order") {
    return "To place an order: Home > Schedule Pickup > Select Service > Select Items > Choose Date/Slot > Add Address > Payment.";
  }

  return "I can help with order status, delivery charges, timings, services, turnaround time, and placing an order. Please ask one of these.";
};
