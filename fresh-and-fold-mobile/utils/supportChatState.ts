export type SupportChatRole = "user" | "assistant" | "admin";

export type SupportChatMessage = {
  id: string;
  role: SupportChatRole;
  text: string;
  time: string;
  createdAt?: string;
};

export type DismissedSupportTicketState = {
  ticketId: string;
  messageCount: number;
};

export const parseDismissedTicketState = (
  raw: string | null
): DismissedSupportTicketState | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DismissedSupportTicketState>;
    if (
      typeof parsed.ticketId === "string" &&
      parsed.ticketId &&
      typeof parsed.messageCount === "number"
    ) {
      return {
        ticketId: parsed.ticketId,
        messageCount: parsed.messageCount,
      };
    }
  } catch {
    if (raw.trim()) {
      return {
        ticketId: raw.trim(),
        messageCount: Number.MAX_SAFE_INTEGER,
      };
    }
  }

  return null;
};

export const mergeConversationMessages = (
  current: SupportChatMessage[],
  ticketMessages: SupportChatMessage[]
) => {
  const next = [...current];
  const existingKeys = new Set(
    current.map((message) =>
      message.createdAt
        ? `${message.role}|${message.text}|${message.createdAt}`
        : `local|${message.id}`
    )
  );

  ticketMessages.forEach((message) => {
    const key = message.createdAt
      ? `${message.role}|${message.text}|${message.createdAt}`
      : `local|${message.id}`;

    if (existingKeys.has(key)) {
      return;
    }

    let localOnlyMatchIndex = -1;
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const existingMessage = next[index];
      if (
        !existingMessage.createdAt &&
        existingMessage.role === message.role &&
        existingMessage.text === message.text
      ) {
        localOnlyMatchIndex = index;
        break;
      }
    }

    if (localOnlyMatchIndex >= 0) {
      next[localOnlyMatchIndex] = {
        ...next[localOnlyMatchIndex],
        id: message.id,
        time: message.time,
        createdAt: message.createdAt,
      };
      existingKeys.add(key);
      return;
    }

    existingKeys.add(key);
    next.push(message);
  });

  return next;
};
