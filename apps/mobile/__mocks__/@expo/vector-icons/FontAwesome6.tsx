import { Text } from "react-native";

export default function FontAwesome6({
  name,
  testID,
}: Readonly<{ name: string; testID?: string }>) {
  return <Text testID={testID}>{name}</Text>;
}
