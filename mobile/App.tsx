import {
  BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from "@expo-google-fonts/manrope";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAddMenu } from "./src/components/rows";
import { HeaderButton, Ionicons, type IconName } from "./src/components/ui";
import { PremiumProvider } from "./src/lib/premium";
import { StoreProvider, useStore } from "./src/lib/store";
import { CustomerForm, ExpenseForm, GroupForm, ItemForm, ProductForm, SaleForm } from "./src/screens/Forms";
import { GroupScreen, HomeScreen, ItemScreen, ProjectsScreen } from "./src/screens/HomeScreens";
import { AddScreen, CustomersScreen, ExpensesScreen, ProductsScreen, SalesScreen } from "./src/screens/ListScreens";
import { AccountScreen, CategoriesScreen, ChannelsScreen, PaywallScreen, SettingsScreen } from "./src/screens/SettingsScreens";
import { TaxReportScreen } from "./src/screens/TaxReportScreen";
import { C, F } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: C.ember, background: C.bg, card: C.surface, text: C.text, border: C.line, notification: C.ember },
};

const stackOptions: NativeStackNavigationOptions = {
  headerLargeTitle: true,
  headerTransparent: Platform.OS === "ios",
  headerBlurEffect: "systemChromeMaterialDark",
  headerLargeTitleShadowVisible: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : C.bg },
  headerLargeStyle: { backgroundColor: C.bg },
  headerTintColor: C.ember,
  headerTitleStyle: { fontFamily: F.displayBold, color: C.text },
  headerLargeTitleStyle: { fontFamily: F.display, color: C.text },
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: C.bg },
};

const sheetOptions: NativeStackNavigationOptions = {
  presentation: "modal",
  headerLargeTitle: false,
  headerTransparent: false,
  headerStyle: { backgroundColor: C.bg },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: F.displayBold, color: C.text },
  contentStyle: { backgroundColor: C.bg },
};

function AddButton() {
  const menu = useAddMenu();
  return <HeaderButton icon="add" label="Add" primary onPress={menu} />;
}
function SettingsButton() {
  const nav = useNavigation<any>();
  return <HeaderButton icon="settings-outline" label="Settings" onPress={() => nav.push("Settings")} />;
}

// Each tab is its own stack, so detail screens slide in with the tab bar still showing.
function tabStack(name: string, title: string, Component: React.ComponentType<any>, extra?: Partial<NativeStackNavigationOptions>) {
  return function TabStack() {
    return (
      <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name={name} component={Component} options={{ title, headerRight: () => <AddButton />, ...extra }} />
        <Stack.Screen name="GroupDetail" component={GroupScreen} options={{ title: "" }} />
        <Stack.Screen name="ItemDetail" component={ItemScreen} options={{ title: "" }} />
        <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: "Customers" }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen name="TaxReports" component={TaxReportScreen} options={{ title: "Tax reports" }} />
        <Stack.Screen name="Channels" component={ChannelsScreen} options={{ title: "Sales channels", headerLargeTitle: false }} />
        <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: "Expense categories", headerLargeTitle: false }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account", headerLargeTitle: false }} />
      </Stack.Navigator>
    );
  };
}

const TABS: { name: string; label: string; icon: IconName; iconOn: IconName; Comp: React.ComponentType<any> }[] = [
  { name: "HomeTab", label: "Home", icon: "home-outline", iconOn: "home", Comp: tabStack("Home", "Overview", HomeScreen, { headerLeft: () => <SettingsButton /> }) },
  { name: "ProjectsTab", label: "Projects", icon: "layers-outline", iconOn: "layers", Comp: tabStack("Projects", "Projects", ProjectsScreen) },
  { name: "SalesTab", label: "Sales", icon: "trending-up-outline", iconOn: "trending-up", Comp: tabStack("Sales", "Sales", SalesScreen) },
  { name: "ExpensesTab", label: "Expenses", icon: "receipt-outline", iconOn: "receipt", Comp: tabStack("Expenses", "Expenses", ExpensesScreen) },
  { name: "ProductsTab", label: "Products", icon: "cube-outline", iconOn: "cube", Comp: tabStack("Products", "Products", ProductsScreen) },
];

function TabsScreen() {
  return (
    <Tabs.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.ember,
      tabBarInactiveTintColor: C.muted,
      tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.line },
      tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11 },
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
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
    JetBrainsMono_500Medium, JetBrainsMono_600SemiBold,
  });
  const go = ready && (fontsLoaded || !!fontError);
  useEffect(() => { if (go) SplashScreen.hideAsync().catch(() => {}); }, [go]);
  if (!go) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Root.Navigator screenOptions={sheetOptions}>
        <Root.Screen name="Tabs" component={TabsScreen} options={{ headerShown: false, presentation: "card" }} />
        <Root.Screen name="Sale" component={SaleForm} />
        <Root.Screen name="Expense" component={ExpenseForm} />
        <Root.Screen name="Product" component={ProductForm} />
        <Root.Screen name="Group" component={GroupForm} />
        <Root.Screen name="Item" component={ItemForm} />
        <Root.Screen name="Customer" component={CustomerForm} />
        <Root.Screen name="Add" component={AddScreen} options={({ navigation }) => ({
          title: "Add", headerLeft: () => <HeaderButton label="Cancel" onPress={() => navigation.goBack()} />,
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
