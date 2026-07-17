import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { AiUploadImage } from "../services/aiService";

export const AI_IMAGE_MAX_LONG_EDGE = 1600;
export const AI_IMAGE_JPEG_COMPRESSION = 0.8;

type ImageSource = "camera" | "gallery";

export type GarmentImageSelection =
  | { kind: "selected"; image: AiUploadImage }
  | { kind: "cancelled" }
  | { kind: "permission_denied"; source: ImageSource };

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  allowsMultipleSelection: false,
  quality: 1,
  exif: false,
  base64: false,
};

const normalizeGarmentImage = async (
  asset: ImagePicker.ImagePickerAsset
): Promise<AiUploadImage> => {
  const resizeAction =
    Math.max(asset.width, asset.height) > AI_IMAGE_MAX_LONG_EDGE
      ? [
          {
            resize:
              asset.width >= asset.height
                ? { width: AI_IMAGE_MAX_LONG_EDGE }
                : { height: AI_IMAGE_MAX_LONG_EDGE },
          },
        ]
      : [];

  const normalized = await ImageManipulator.manipulateAsync(asset.uri, resizeAction, {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: AI_IMAGE_JPEG_COMPRESSION,
    base64: false,
  });

  return {
    uri: normalized.uri,
    name: "garment-scan.jpg",
    type: "image/jpeg",
  };
};

/** Selects one image and produces a transient, normalized JPEG for Phase B upload. */
export const selectGarmentImage = async (
  source: ImageSource
): Promise<GarmentImageSelection> => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { kind: "permission_denied", source };
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets[0]) {
    return { kind: "cancelled" };
  }

  return { kind: "selected", image: await normalizeGarmentImage(result.assets[0]) };
};
