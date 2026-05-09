import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0f172a" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "CarCheck" }} />
        <Stack.Screen
          name="report/[vin]"
          options={{ title: "Vehicle Report", headerBackTitle: "Back" }}
        />
      </Stack>
    </>
  );
}
