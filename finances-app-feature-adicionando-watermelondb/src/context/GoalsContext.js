import React, { createContext, useCallback, useEffect, useState } from "react";
import { Alert, ToastAndroid } from "react-native";
import { goalRepo } from "../repositories/goal";
let database = null;
try { database = require("../databases").database; } catch { database = null; }

export const GoalsContext = createContext({});

export function GoalsContextProvider(props) {
  const [GoalsList, setGoalsList] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState();

  async function addTransaction(newGoal) {
    try {
      if (database) {
        await database.write(async () => {
          await database.get("goals").create((data) => {
            data._raw.description = newGoal.description;
            data._raw.amount = newGoal.amount;
            data._raw.currentAmount = newGoal.currentAmount;
            data._raw.date = newGoal.date;
            if(newGoal.category) data._raw.category = newGoal.category;
            if(newGoal.icon) data._raw.icon = newGoal.icon;
          });
        });
      } else {
        await goalRepo.add(newGoal);
      }
    } catch (error) {
      try { await goalRepo.add(newGoal); } catch {}
      console.log("addTransaction error", error);
    }
    loadData();
    ToastAndroid.show("Meta Adicionada", ToastAndroid.SHORT);
  }

  async function updateTransaction(currentGoal) {
    try {
      if (database) {
        const itemToUpdate = await database.get("goals").find(currentGoal.id);
        await database.write(async () => {
          await itemToUpdate.update((data) => {
            data._raw.description = currentGoal.description;
            data._raw.amount = currentGoal.amount;
            data._raw.currentAmount = currentGoal.currentAmount;
            data._raw.date = currentGoal.date;
            if(currentGoal.category) data._raw.category = currentGoal.category;
            if(currentGoal.icon) data._raw.icon = currentGoal.icon;
          });
        });
      } else {
        await goalRepo.update(currentGoal.id, currentGoal);
      }
    } catch (error) {
      try { await goalRepo.update(currentGoal.id, currentGoal); } catch {}
      console.log("updateTransaction error", error);
    }
    loadData();
    ToastAndroid.show("Meta Atualizada", ToastAndroid.SHORT);
  }

  async function deleteTransaction(currentGoal) {
    Alert.alert(
      "Deseja realmente deletar esse registro?",
      "Esta ação é irreversível! Deseja continuar?",
      [
        {
          text: "Não",
          style: "cancel",
          onPress: () => console.log("Não pressed"),
        },
        {
          text: "Sim",
          onPress: async () => {
            try {
              if (database) {
                const itemToDelete = await database.get("goals").find(currentGoal.id);
                await database.write(async () => { await itemToDelete.destroyPermanently(); });
              } else {
                await goalRepo.delete(currentGoal.id);
              }
            } catch (error) {
              try { await goalRepo.delete(currentGoal.id); } catch {}
              console.log("deleteTransaction error", error);
            }
            loadData();
            ToastAndroid.show("Meta Removida", ToastAndroid.SHORT);
          },
        },
      ]
    );
  }

  const loadData = useCallback(async () => {
    try {
      if (database) {
        const goalsCollection = database.get("goals");
        const response = await goalsCollection.query().fetch();
        const currentList = response.map((item) => item._raw);
        setGoalsList(currentList);
      } else {
        const list = await goalRepo.getAll();
        setGoalsList(list);
      }
    } catch (error) {
      try { const list = await goalRepo.getAll(); setGoalsList(list); } catch { setGoalsList([]); }
    }
    return;
  }, [setGoalsList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <GoalsContext.Provider
      value={{
        GoalsList,
        setGoalsList,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        selectedTransaction,
        setSelectedTransaction,
      }}
    >
      {props.children}
    </GoalsContext.Provider>
  );
}
