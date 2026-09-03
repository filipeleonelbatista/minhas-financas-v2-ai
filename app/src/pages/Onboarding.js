import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import { useEffect, useState, useRef } from "react";
import { Alert, Platform, ToastAndroid, useWindowDimensions, View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import Loading from "../components/Loading";
import { useSettings } from "../hooks/useSettings";
import CTA from "../components/ui/CTA";
import { setHasSeenTour } from "../components/Tour";

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const { selectedFolderToSave, handleUpdateSelectedFolderToSave } = useSettings();

  const [isOnboardingPassed, setIsOnboardingPassed] = useState("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const slides = [
    {
      id: "1",
      image: require("../assets/onboarding/1.png"),
      title: "Organize suas finanças",
      subtitle: "Organize as contas a receber, seus ganhos, edite, delete, favorite e filtre para facilitar sua organização.",
      show: false,
    },
    {
      id: "2",
      image: require("../assets/onboarding/2.png"),
      title: "Exporte e importe os dados",
      subtitle: "Importe ou exporte dados para compartilhar suas listas com quem quiser",
      show: false,
    },
    {
      id: "3",
      image: require("../assets/onboarding/3.png"),
      title: "Organize suas compras",
      subtitle: "Crie sua lista de compras para se programar para as compras do mes. Atualize e remova, se quiser, os itens, gerencie seu estoque de mantimentos e muito mais.",
      show: false,
    },
    {
      id: "4",
      image: require("../assets/onboarding/4.png"),
      title: "Controle a autonomia do veículo",
      subtitle: "Adicione os abastecimentos e tenha o controle da autonomia do veículo e adicione automaticamente os abastecimentos erm finanças",
      show: false,
    },
    {
      id: "5",
      image: require("../assets/onboarding/5.png"),
      title: "Veja os relatórios",
      subtitle: "Explore suas finanças e abastecimentos com relatórios e crie metas para alcançar seus sonhos mais rápido",
      show: false,
    },
    {
      id: "6",
      image: require("../assets/onboarding/6.png"),
      title: "Integrado com Inteligência artificial",
      subtitle: "Use inteligência artificial para conversar e obter dicas sobre suas finanças.",
      show: false,
    },
    {
      id: "7",
      image: require("../assets/onboarding/7.png"),
      title: "Modo escuro",
      subtitle: "Ideal para ambientes com baixa luminosidade.",
      show: true,
    },
  ];

  async function preleavingOnboarding() {
    if (Platform.OS !== 'android') {
      await handleLeaveOnboarding();
      return;
    }
    Alert.alert(
      "Antes de começar...",
      `Precisamos definir um local onde vamos salvar as tabelas onde você pode acessar e compartilhar com seus amigos e familiares. confirme a solicitação a seguir e crie uma pasta para salvar se for necessário.`,
      [
        {
          text: "Ok",
          onPress: async () => {
            try {
              const requestedDirPerm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (requestedDirPerm.granted) {
                await handleUpdateSelectedFolderToSave(requestedDirPerm.directoryUri);
                ToastAndroid.show("Pasta selecionada!", ToastAndroid.SHORT);
              } else {
                ToastAndroid.show("Pasta não selecionada, você pode configurar depois.", ToastAndroid.SHORT);
              }
            } catch {}
            await handleLeaveOnboarding();
          },
        },
      ]
    );
  }

  async function handleLeaveOnboarding() {
    try {
      await AsyncStorage.setItem("@onboarding", "true");
      // persist interactive tour as NOT seen so spotlight starts after onboarding
      try {
        await setHasSeenTour(false);
      } catch {}
      setIsOnboardingPassed("passed");
      navigation.navigate("TabNavigator", { screen: "Início" });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSkip() {
    try {
      await AsyncStorage.setItem("@onboarding", "true");
      // Pular marks tour as seen (user opted to skip spotlight)
      try {
        await setHasSeenTour(true);
      } catch {}
      setIsOnboardingPassed("passed");
      navigation.navigate("TabNavigator", { screen: "Início" });
    } catch (e) {
      console.error(e);
    }
  }

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      preleavingOnboarding();
    }
  }

  useEffect(() => {
    if (isFocused) {
      const executeAsync = async () => {
        try {
          const value = await AsyncStorage.getItem("@onboarding");
          if (value !== null) {
            if (JSON.parse(value)) {
              setIsOnboardingPassed("passed");
              navigation.navigate("TabNavigator", { screen: "Início" });
            }
          } else {
            setIsOnboardingPassed("no-passed");
          }
        } catch (e) {
          console.error(e);
        }
      };
      executeAsync();
    }
  }, [isFocused, navigation]);

  if (isOnboardingPassed === "waiting") {
    return <Loading />;
  }

  const isLast = currentIndex === slides.length - 1;

  return (
    <View className="flex-1 bg-purple-900" style={{ flex: 1, backgroundColor: "#581C87" }} testID="onboarding-container">
      {/* Header Pular */}
      <View className="flex-row justify-end px-4 pt-12" style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 48 }}>
        {!isLast && (
          <TouchableOpacity
            onPress={handleSkip}
            testID="onboarding-skip"
            accessibilityRole="button"
            accessibilityLabel="Pular"
            className="px-4 py-2"
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text className="text-white text-sm font-semibold" style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
              Pular
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        data={slides}
        keyExtractor={(item) => String(item.id)}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        testID="onboarding-flatlist"
        renderItem={({ item }) => (
          <View
            className="items-center justify-center px-4"
            style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flex: 1 }}
            testID={`onboarding-slide-${item.id}`}
          >
            <Image
              source={item.image}
              style={{ width: width * 0.8, height: width * 0.8, borderRadius: 8, resizeMode: 'contain' }}
              accessibilityLabel={item.title}
              testID={`onboarding-image-${item.id}`}
            />
            <Text className="text-lg text-white text-center mt-4 font-semibold" style={{ fontSize: 18, color: '#F0F2F5', textAlign: 'center', marginTop: 16, fontWeight: '600' }} testID={`onboarding-title-${item.id}`}>
              {item.title}
            </Text>
            <Text className="text-sm text-white text-center mt-2 opacity-90" style={{ fontSize: 14, color: '#F0F2F5', textAlign: 'center', marginTop: 8, opacity: 0.9 }} testID={`onboarding-subtitle-${item.id}`}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Pagination dots */}
      <View className="flex-row justify-center items-center mb-4" style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }} testID="onboarding-dots">
        {slides.map((_, idx) => (
          <View
            key={idx}
            testID={`onboarding-dot-${idx}`}
            className={idx === currentIndex ? "w-6 h-2 rounded-full bg-white mx-1" : "w-2 h-2 rounded-full bg-white/40 mx-1"}
            style={{
              width: idx === currentIndex ? 24 : 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>

      {/* CTA reacticx + Próximo / Vamos começar */}
      <View className="px-6 pb-8 items-center" style={{ paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' }}>
        <CTA
          testID="onboarding-cta"
          onPress={handleNext}
          variant="glow"
          accessibilityLabel={isLast ? "Vamos começar?!" : "Próximo"}
          style={{ width: '70%', borderRadius: 999 }}
        >
          <View className="flex-row items-center justify-center" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-white font-bold text-base mr-2" style={{ color: 'white', fontWeight: '700', fontSize: 16, marginRight: 8 }}>
              {isLast ? "Vamos começar?!" : "Próximo"}
            </Text>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </View>
        </CTA>
        {!isLast && (
          <Text className="text-white/60 text-xs mt-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 12 }}>
            {currentIndex + 1} de {slides.length}
          </Text>
        )}
      </View>
    </View>
  );
}
