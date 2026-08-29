import { useMarketStore } from '../../src/stores/market';
import { marketRepo } from '../../src/repositories/market';

beforeEach(async () => {
  await marketRepo.clearMemory();
  useMarketStore.setState({ stockList: [], search: '', selectedCategory: 'Todos' });
});

test('load + add stock', async () => {
  await useMarketStore.getState().add({ description: 'Arroz', category: 'Mercado', amount: 10, quantity: 2, quantityDesired: 5 });
  const list = useMarketStore.getState().stockList;
  expect(list.length).toBe(1);
  expect(list[0].quantityDesired).toBe(5);
});
