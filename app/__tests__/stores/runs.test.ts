import { useRunsStore, calcRunEstimative } from '../../src/stores/runs';
import { runRepo } from '../../src/repositories/run';

beforeEach(async () => {
  await runRepo.clearMemory();
  useRunsStore.setState({ runsList: [] });
});

test('load initially empty and add run', async () => {
  const s = useRunsStore.getState();
  await s.load();
  expect(s.runsList.length).toBe(0);

  await s.add({
    currentDistance: 10000,
    unityAmount: 5,
    amount: 100,
    type: 'Gasolina',
    date: Date.now(),
    location: 'Posto Ipiranga',
  });

  const list = useRunsStore.getState().runsList;
  expect(list.length).toBe(1);
  expect(list[0].location).toBe('Posto Ipiranga');
  expect(list[0].currentDistance).toBe(10000);
});

test('update run', async () => {
  const s = useRunsStore.getState();
  await s.add({
    currentDistance: 5000,
    unityAmount: 4,
    amount: 80,
    type: 'Etanol',
    date: Date.now(),
    location: 'Posto A',
  });
  const id = useRunsStore.getState().runsList[0].id;
  await useRunsStore.getState().update(id, { location: 'Posto B', amount: 90 });
  const updated = useRunsStore.getState().runsList[0];
  expect(updated.location).toBe('Posto B');
  expect(updated.amount).toBe(90);
});

test('remove run', async () => {
  const s = useRunsStore.getState();
  await s.add({
    currentDistance: 2000,
    unityAmount: 5,
    amount: 50,
    type: 'Gasolina',
    date: Date.now(),
    location: 'Posto X',
  });
  expect(useRunsStore.getState().runsList.length).toBe(1);
  const id = useRunsStore.getState().runsList[0].id;
  await useRunsStore.getState().remove(id);
  expect(useRunsStore.getState().runsList.length).toBe(0);
  const all = await runRepo.getAll();
  expect(all.length).toBe(0);
});

test('estimative helper pure (veicleAutonomy*amount/unityAmount)+currentDistance', () => {
  const run = { currentDistance: 10000, unityAmount: 5, amount: 100 };
  const veicleAutonomy = 10;
  const result = calcRunEstimative(run, veicleAutonomy);
  // (10*100/5)+10000 = 200+10000=10200
  expect(result).toBe(10200);

  const run2 = { currentDistance: 5000, unityAmount: 4.5, amount: 90 };
  expect(calcRunEstimative(run2, 12)).toBe((12 * 90) / 4.5 + 5000);
});

test('getEstimative uses first run in runsList matching Runs.js:139', async () => {
  const veicleAutonomy = 10;
  await useRunsStore.getState().add({
    currentDistance: 10000,
    unityAmount: 5,
    amount: 100,
    type: 'Gasolina',
    date: Date.now(),
    location: 'Posto 1',
  });
  const estimative = useRunsStore.getState().getEstimative(veicleAutonomy);
  expect(estimative).toBe(10200);

  // when empty returns 0
  await runRepo.clearMemory();
  useRunsStore.setState({ runsList: [] });
  await useRunsStore.getState().load();
  expect(useRunsStore.getState().getEstimative(veicleAutonomy)).toBe(0);
});

test('load reflects repo state', async () => {
  await runRepo.add({
    currentDistance: 1234,
    unityAmount: 6,
    amount: 60,
    type: 'Diesel',
    date: Date.now(),
    location: 'Posto Y',
  });
  await useRunsStore.getState().load();
  expect(useRunsStore.getState().runsList.length).toBe(1);
  expect(useRunsStore.getState().runsList[0].location).toBe('Posto Y');
});
