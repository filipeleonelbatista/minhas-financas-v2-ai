// @ts-nocheck
import OpenAI from "openai";
import { useEffect, useState } from "react";
import { Alert, ToastAndroid } from "react-native";
import { useSettings } from "./useSettings";
import { saveProviderKey } from "../utils/secureStore";

export function useOpenAi() {
  const { apiKey: currentApiKey, handleUpdateApiKey } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [openai, setOpenai] = useState(null);

  const handleSaveApiKey = async (text) => {
    try {
      const client = new OpenAI({
        apiKey: text,
        dangerouslyAllowBrowser: true,
      });

      const result = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Olá mundo" }],
        temperature: 1,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      await saveProviderKey("openai", text);
      await handleUpdateApiKey(text);
      setOpenai(client);
      setApiKey(text);

      ToastAndroid.show("Chave de Api Adicionada", ToastAndroid.SHORT);
    } catch (error) {
      Alert.alert("Houve um erro", openaiErrorHandler(error));
    }
  };

  const checkIfApiKeyExists = async () => {
    if (currentApiKey.length > 0) {
      setApiKey(currentApiKey);
      return true;
    }
    return false;
  };

  useEffect(() => {
    checkIfApiKeyExists();
  }, []);

  const openaiErrorHandler = (error) => {
    // https://platform.openai.com/docs/guides/error-codes/api-errors
    console.log("openaiErrorHandler", error);
    // console.log("openaiErrorHandler", error.response.data)
    // console.log("openaiErrorHandler", Object.keys(error.response.data.error))

    switch (error.response.status) {
      case 400:
        return "Não foi possivel fazer a pesquisa.";
      case 401:
        return "Não foi possivel fazer a pesquisa.";
      case 429:
        return "Não foi possivel fazer a pesquisa.";
      case 500:
        return "Não foi possivel fazer a pesquisa.";
      case 503:
        return "Não foi possivel fazer a pesquisa.";

      default:
        return "Não foi possivel fazer a pesquisa.";
    }
  };

  return {
    apiKey,
    checkIfApiKeyExists,
    handleSaveApiKey,
    openaiErrorHandler,
    openai,
  };
}
