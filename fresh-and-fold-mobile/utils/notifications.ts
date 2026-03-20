import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { registerForPushNotificationsAsync } from "./registerForPushNotifications";

const ORDER_STATUS_NOTIFICATION_KEY = "orderStatusNotificationCache";

const statusMessages: Record<string, { title: string; body: string }> = {
  "Picked Up": {
    title: "Order picked up",
    body: "Your clothes have been collected and are on the way to our facility.",
  },
  "Out for Delivery": {
    title: "Out for delivery",
    body: "Your order is on the way and will reach you soon.",
  },
  Delivered: {
    title: "Order delivered",
    body: "Your Fresh & Fold order has been delivered successfully.",
  },
};

export async function bootstrapNotifications() {
  if (Constants.appOwnership === "expo") {
    return null;
  }

  try {
    return await registerForPushNotificationsAsync();
  } catch {
    return null;
  }
}

export async function notifyOrderStatusUpdate(orderId: string, status: string) {
  if (Constants.appOwnership === "expo") {
    return;
  }

  const notificationContent = statusMessages[status];
  if (!notificationContent) {
    return;
  }

  try {
    const cachedRaw = await AsyncStorage.getItem(ORDER_STATUS_NOTIFICATION_KEY);
    const cached =
      cachedRaw && cachedRaw.trim()
        ? (JSON.parse(cachedRaw) as Record<string, string>)
        : {};

    if (cached[orderId] === status) {
      return;
    }

    const Notifications = await import("expo-notifications");
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== "granted") {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null,
    });

    cached[orderId] = status;
    await AsyncStorage.setItem(
      ORDER_STATUS_NOTIFICATION_KEY,
      JSON.stringify(cached)
    );
  } catch {
    // Ignore notification scheduling failures.
  }
}
