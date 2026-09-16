import { stockSchema } from '../src/schemas/stock.zod';
import { listSchema, listItemSchema } from '../src/schemas/list.zod';

test('stockSchema sanitizes <script>Arroz</script> → Arroz', () => {
  const res = stockSchema.safeParse({
    description: '<script>Arroz</script>',
    category: 'Mercearia',
    amount: 10,
    quantity: 2,
    quantityDesired: 5,
  });
  expect(res.success).toBe(true);
  if (res.success) {
    expect(res.data.description).toBe('Arroz');
    expect(res.data.description).not.toContain('<');
    expect(res.data.description).not.toContain('>');
  }
});

test('stockSchema sanitizes javascript: injection in description', () => {
  const res = stockSchema.safeParse({
    description: 'javascript:alert(1)',
    category: 'Mercearia',
    amount: 5,
    quantity: 1,
    quantityDesired: 1,
  });
  expect(res.success).toBe(true);
  if (res.success) expect(res.data.description).not.toContain('javascript:');
});

test('listSchema sanitizes description', () => {
  const res = listSchema.safeParse({
    description: '<b>Compra</b>',
    location: 'Mercado',
    quantity: 2,
    amount: 100,
    date: Date.now(),
  });
  expect(res.success).toBe(true);
  if (res.success) expect(res.data.description).toBe('Compra');
});

test('listItemSchema sanitizes description with script', () => {
  const res = listItemSchema.safeParse({
    list_id: 'list-1',
    description: '<script>Leite</script>',
    category: 'Mercearia',
    amount: 5,
    quantity: 1,
    quantityDesired: 2,
    location: '',
    date: Date.now(),
  });
  expect(res.success).toBe(true);
  if (res.success) expect(res.data.description).toBe('Leite');
});
