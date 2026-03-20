import * as Haptics from "expo-haptics";

export async function triggerSelectionHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Ignore haptic failures in unsupported runtimes.
  }
}

export async function triggerImpactHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
) {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Ignore haptic failures in unsupported runtimes.
  }
}

export async function triggerSuccessHaptic() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignore haptic failures in unsupported runtimes.
  }
}
