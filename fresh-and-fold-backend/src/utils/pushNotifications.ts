type ExpoSdkModule = typeof import("expo-server-sdk");
let expoModulePromise: Promise<ExpoSdkModule> | null = null;

const loadExpoSdk = async () => {
  if (!expoModulePromise) {
    expoModulePromise = import("expo-server-sdk");
  }
  return expoModulePromise;
};

export const sendPushNotification = async (
  pushToken: string,
  message: string
) => {
  const { Expo } = await loadExpoSdk();

  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title: "Fresh & Fold",
      body: message,
    },
  ];

  const expo = new Expo();
  await expo.sendPushNotificationsAsync(messages);
};
