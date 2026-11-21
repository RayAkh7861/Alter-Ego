// OWNER: Person 1
const fakeGame = {
  name: 'Moss',
  preference: 'wonder',
  seed: 12345,
  luck: 50,
  replants: 1,
  life: 2,
  status: 'dead',
  currentId: 'n7',
  erasedMemories: ['You crossed the amber field.'],
  nodes: {
    n0: { id: 'n0', parentId: null, life: 1, chapter: 0, title: 'The Treehouse', narration: 'A door opens in the roots.', summaryLine: 'You entered the treehouse.', choices: [{ text: 'Step inside', risk: 'good' }], chosenIndex: 0, dead: false },
    n1: { id: 'n1', parentId: 'n0', life: 1, chapter: 1, title: 'First Steps', narration: 'Morning follows you.', summaryLine: 'You followed the morning.', choices: [{ text: 'Keep walking', risk: 'good' }, { text: 'Take the shortcut', risk: 'bold' }], chosenIndex: 0, dead: false },
    n2: { id: 'n2', parentId: 'n1', life: 1, chapter: 2, title: 'The Orchard', narration: 'The orchard hums.', summaryLine: 'You listened to the orchard.', choices: [{ text: 'Wait awhile', risk: 'good' }, { text: 'Run ahead', risk: 'wild' }], chosenIndex: 1, dead: false },
    n3: { id: 'n3', parentId: 'n2', life: 1, chapter: 3, title: 'The Long Road', narration: 'Clouds gathered.', summaryLine: 'You walked under dark clouds.', choices: [{ text: 'Turn back', risk: 'bad' }], chosenIndex: 0, dead: true },
    n4: { id: 'n4', parentId: 'n3', life: 1, chapter: 4, title: 'A Closed Gate', narration: 'The gate would not open.', summaryLine: 'You found a closed gate.', choices: [], chosenIndex: null, dead: true },
    n5: { id: 'n5', parentId: 'n2', life: 2, chapter: 3, title: 'A Familiar Path', narration: 'Something feels remembered.', summaryLine: 'You returned by another path.', choices: [{ text: 'Follow the birds', risk: 'good' }], chosenIndex: 0, dead: false },
    n6: { id: 'n6', parentId: 'n5', life: 2, chapter: 4, title: 'The River', narration: 'A river reflects the sky.', summaryLine: 'You crossed the river.', choices: [{ text: 'Trust the bridge', risk: 'mixed' }], chosenIndex: 0, dead: false },
    n7: { id: 'n7', parentId: 'n6', life: 2, chapter: 5, title: 'Last Light', narration: 'The last light settles on the leaves.', summaryLine: 'You watched the last light.', choices: [], chosenIndex: null, dead: false },
  },
};

export default fakeGame;
