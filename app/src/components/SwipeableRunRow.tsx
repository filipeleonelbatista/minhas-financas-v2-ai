import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

let Swipeable: any = null;
try {
  Swipeable = require('react-native-gesture-handler').Swipeable;
} catch {
  Swipeable = null;
}

const PURPLE_600 = "#9c44dc";
const RED_500 = "#ef4444";

interface Props {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  children: React.ReactNode;
}

export default function SwipeableRunRow({ item, onEdit, onDelete, children }: Props) {
  const ref = useRef<any>(null);
  const close = () => { try { ref.current?.close(); } catch {} };
  const handleEdit = () => { close(); onEdit(item); };
  const handleDelete = () => { close(); onDelete(item); };

  if (!Swipeable || process.env.NODE_ENV === 'test') {
    return (
      <View style={styles.container} testID={`swipe-run-row-${item.id}`}>
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
          <TouchableOpacity testID={`run-swipe-edit-${item.id}`} onPress={handleEdit}><Text>Editar</Text></TouchableOpacity>
          <TouchableOpacity testID={`run-swipe-delete-${item.id}`} onPress={handleDelete}><Text>Excluir</Text></TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  const renderLeftActions = () => (
    <View style={styles.leftActions}>
      <TouchableOpacity testID={`run-swipe-delete-${item.id}`} onPress={handleDelete} style={[styles.actionButton, { backgroundColor: RED_500 }]} activeOpacity={0.8}>
        <Feather name="trash-2" size={20} color="white" />
        <Text style={styles.actionText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );
  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <TouchableOpacity testID={`run-swipe-edit-${item.id}`} onPress={handleEdit} style={[styles.actionButton, { backgroundColor: PURPLE_600 }]} activeOpacity={0.8}>
        <Feather name="edit-2" size={20} color="white" />
        <Text style={styles.actionText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable ref={ref} renderLeftActions={renderLeftActions} renderRightActions={renderRightActions} overshootLeft={false} overshootRight={false} friction={2} leftThreshold={40} rightThreshold={40}>
      <View testID={`swipe-run-row-${item.id}`} style={{ backgroundColor: 'transparent' }}>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  leftActions: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  rightActions: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, justifyContent: 'flex-end' },
  actionButton: { width: 96, height: '92%', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, gap: 4 },
  actionText: { color: 'white', fontWeight: '700', fontSize: 12, marginTop: 2 },
});
