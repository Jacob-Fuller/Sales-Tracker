import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAdd, useAddMenu } from "./src/components/rows";
import { HeaderIcon, HeaderText, Ionicons, type IconName } from "./src/components/ui";
import { PremiumProvider } from "./src/lib/premium";
import { StoreProvider, useStore } from "./src/lib/store";
import { ExpenseForm, ProductForm, ProjectForm, SaleForm } from "./src/screens/Forms";
import { HomeScreen, ProjectDetailScreen } from "./src/screens/HomeScreens";
import { AddScreen, ExpensesScreen, ProductsScreen, ProjectsScreen, SalesScreen } from "./src/screens/ListScreens";
import { AccountScreen, CategoriesScreen, ChannelsScreen, PaywallScreen, SettingsScreen } from "./src/screens/SettingsScreens";
import { TaxReportScreen } from "./src/screens/TaxReportScreen";
import { usePalette, type Palette } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function stackOptions(c: Palette): NativeStackNavigationOptions {
  return {
    headerLargeTitle: true,
    headerTransparent: Platform.OS === "ios",
    headerBlurEffect: c.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight",
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : c.bg },
    headerLargeStyle: { backgroundColor: c.bg },
    headerTintColor: c.accent,
    headerTitleStyle: { color: c.text },
    headerLargeTitleStyle: { color: c.text },
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: c.bg },
  };
}

function sheetOptions(c: Palette): NativeStackNavigationOptions {
  return {
    presentation: "modal",
    headerLargeTitle: false,
    headerTransparent: false,
    headerStyle: { backgroundColor: c.bg },
    headerShadowVisible: false,
    headerTitleStyle: { color: c.text },
    contentStyle: { backgroundColor: c.bg },
  };
}

const HomeAdd = () => { const menu = useAddMenu(); return <HeaderIcon icon="add" label="Add" onPress={menu} />; };
const SaleAdd = () => { const add = useAdd(); return <HeaderIcon icon="add" label="Add Sale" onPress={() => add("sale")} />; };
const ExpenseAdd = () => { const add = useAdd(); return <HeaderIcon icon="add" label="Add Expense" onPress={() => add("expense")} />; };
const SettingsButton = () => {
  const nav = useNavigation<any>();
  return <HeaderIcon icon="settings-outline" label="Settings" onPress={() => nav.push("Settings")} />;
};

// Each tab is its own stack, so detail screens slide in with the tab bar still showing.
function tabStack(name: string, title: string, Component: React.ComponentType<any>, extra: Partial<NativeStackNavigationOptions>) {
  return function TabStack() {
    const c = usePalette();
    return (
      <Stack.Navigator screenOptions={stackOptions(c)}>
        <Stack.Screen name={name} component={Component} options={{ title, ...extra }} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: "" }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: "Projects" }} />
        <Stack.Screen name="Products" component={ProductsScreen} options={{ title: "Products" }} />
        <Stack.Screen name="TaxReports" component={TaxReportScreen} options={{ title: "Tax Reports" }} />
        <Stack.Screen name="Channels" component={ChannelsScreen} options={{ title: "Sales Channels", headerLargeTitle: false }} />
        <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: "Expense Categories", headerLargeTitle: false }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account", headerLargeTitle: false }} />
      </Stack.Navigator>
    );
  };
}

const TABS: { name: string; label: string; icon: IconName; iconOn: IconName; Comp: React.ComponentType<any> }[] = [
  { name: "HomeTab", label: "Home", icon: "home-outline", iconOn: "home",
    Comp: tabStack("Home", "Home", HomeScreen, { headerLeft: () => <SettingsButton />, headerRight: () => <HomeAdd /> }) },
  { name: "SalesTab", label: "Sales", icon: "bag-handle-outline", iconOn: "bag-handle",
    Comp: tabStack("Sales", "Sales", SalesScreen, { headerRight: () => <SaleAdd /> }) },
  { name: "ExpensesTab", label: "Expenses", icon: "receipt-outline", iconOn: "receipt",
    Comp: tabStack("Expenses", "Expenses", ExpensesScreen, { headerRight: () => <ExpenseAdd /> }) },
];

function TabsScreen() {
  const c = usePalette();
  return (
    <Tabs.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.secondary,
      tabBarStyle: { backgroundColor: c.dark ? "#121212" : "#F9F9F9", borderTopColor: c.separator },
      tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
    }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} component={t.Comp} options={{
          tabBarLabel: t.label,
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? t.iconOn : t.icon} size={size} color={color} />,
        }} />
      ))}
    </Tabs.Navigator>
  );
}

function Shell() {
  const { ready } = useStore();
  const c = usePalette();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const base = c.dark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.card, text: c.text, border: c.separator, notification: c.accent } };
  const sheet = sheetOptions(c);
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="auto" />
      <Root.Navigator screenOptions={sheet}>
        <Root.Screen name="Tabs" component={TabsScreen} options={{ headerShown: false, presentation: "card" }} />
        <Root.Screen name="Sale" component={SaleForm} />
        <Root.Screen name="Expense" component={ExpenseForm} />
        <Root.Screen name="Product" component={ProductForm} />
        <Root.Screen name="Project" component={ProjectForm} />
        <Root.Screen name="Add" component={AddScreen} options={({ navigation }) => ({
          title: "Add", headerLeft: () => <HeaderText label="Cancel" onPress={() => navigation.goBack()} />,
        })} />
        <Root.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <PremiumProvider>
          <Shell />
        </PremiumProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
