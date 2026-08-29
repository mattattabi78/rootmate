import * as FileSystem from 'expo-file-system/legacy';

/**
 * Remote generated images are copied into app storage because provider URLs expire.
 */
export async function persistImageUri(uri: string): Promise<string> {
  if (!uri.startsWith('http')) return uri;

  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error('앱 이미지 저장 공간을 사용할 수 없습니다.');

  const filename = `generated-plant-${Date.now()}.jpg`;
  const destination = `${directory}${filename}`;
  const result = await FileSystem.downloadAsync(uri, destination);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`이미지 다운로드 실패 (${result.status})`);
  }
  return result.uri;
}
