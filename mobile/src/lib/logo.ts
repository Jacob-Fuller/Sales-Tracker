import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// Pick a picture from the photo library, crop it square and shrink it to a
// small logo that's saved (and synced) with the item.
export async function pickLogo(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const out = await ImageManipulator.manipulateAsync(
    res.assets[0].uri,
    [{ resize: { width: 160, height: 160 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return out.base64 ? "data:image/jpeg;base64," + out.base64 : null;
}
