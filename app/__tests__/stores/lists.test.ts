import { useListsStore } from '../../src/stores/lists';
import { listRepo } from '../../src/repositories/list';

beforeEach(async () => {
  await listRepo.clearMemory();
  useListsStore.setState({
    lists: [],
    selectedList: null,
    selectedListItems: [],
    search: '',
    selectedCategory: 'Todos os itens',
  });
});

test('add list + addItem + cascade delete', async () => {
  const s = useListsStore.getState();
  const id = await s.addList({ description: 'Compra', location: '', amount: 0, quantity: 0, date: Date.now() });
  expect(id).toBeDefined();
  await s.addItem({ list_id: id, description: 'Leite', category: 'Mercado', amount: 5, quantity: 1, quantityDesired: 2, date: Date.now() });
  expect(useListsStore.getState().selectedListItems.length).toBe(1);
  expect(useListsStore.getState().selectedListItems[0].description).toBe('Leite');
  // verify lists loaded
  expect(useListsStore.getState().lists.length).toBe(1);
  await s.deleteList(id);
  expect(useListsStore.getState().lists.length).toBe(0);
  // cascade: items should be gone - selecting deleted list yields empty
  expect(useListsStore.getState().selectedList).toBeNull();
  expect(useListsStore.getState().selectedListItems.length).toBe(0);
  // repo level cascade
  const itemsAfter = await listRepo.getItems(id);
  expect(itemsAfter.length).toBe(0);
});

test('updateQuantity +1', async () => {
  const s = useListsStore.getState();
  const id = await s.addList({ description: 'Compra', location: '', amount: 0, quantity: 0, date: Date.now() });
  await s.addItem({ list_id: id, description: 'Leite', category: 'Mercado', amount: 5, quantity: 1, quantityDesired: 2, date: Date.now() });
  const item = useListsStore.getState().selectedListItems[0];
  expect(item.quantity).toBe(1);
  await useListsStore.getState().updateQuantity(item, true);
  const updated = useListsStore.getState().selectedListItems[0];
  expect(updated.quantity).toBe(2);
});

test('updateQuantity -1', async () => {
  const s = useListsStore.getState();
  const id = await s.addList({ description: 'Compra', location: '', amount: 0, quantity: 0, date: Date.now() });
  await s.addItem({ list_id: id, description: 'Arroz', category: 'Mercado', amount: 10, quantity: 2, quantityDesired: 5, date: Date.now() });
  const item = useListsStore.getState().selectedListItems[0];
  await useListsStore.getState().updateQuantity(item, false);
  const updated = useListsStore.getState().selectedListItems[0];
  expect(updated.quantity).toBe(1);
});

test('filteredList getter filters by search and category', async () => {
  const s = useListsStore.getState();
  const id = await s.addList({ description: 'Compra', location: '', amount: 0, quantity: 0, date: Date.now() });
  await s.addItem({ list_id: id, description: 'Leite', category: 'Mercado', amount: 5, quantity: 1, quantityDesired: 2, date: Date.now() });
  await s.addItem({ list_id: id, description: 'Sabão', category: 'Limpeza', amount: 3, quantity: 1, quantityDesired: 1, date: Date.now() });
  useListsStore.getState().setSearch('Leite');
  expect(useListsStore.getState().filteredList.length).toBe(1);
  expect(useListsStore.getState().filteredList[0].description).toBe('Leite');
  useListsStore.getState().setSearch('');
  useListsStore.getState().setSelectedCategory('Limpeza');
  expect(useListsStore.getState().filteredList.length).toBe(1);
  expect(useListsStore.getState().filteredList[0].category).toBe('Limpeza');
});
