// Owner: A
export const ACTS = {
  1: {
    name: 'Roots',
    roman: 'I',
    ages: '8–33',
    focus:
      'childhood and youth: family, school, friendship, first love, leaving home',
    settings: ['home', 'village', 'fields', 'forest', 'mountains'],
    aphorism:
      'Everyone you love is still alive. Nobody tells you this is the good part.',
  },
  2: {
    name: 'Branches',
    roman: 'II',
    ages: '33–70',
    focus:
      "the middle of life: work, money, a partner, children, ambition, betrayal, a parent's illness",
    settings: ['city', 'harbour', 'sea', 'home'],
    aphorism: 'You will get what you asked for. That was always the danger.',
  },
  3: {
    name: 'Leaf-fall',
    roman: 'III',
    ages: '70–90',
    focus:
      'old age and coming home: loss, the people you outlived, reckoning, what remains',
    settings: ['village', 'home', 'forest', 'harbour'],
    aphorism:
      'You come back to where you started. It is smaller than you remember.',
  },
};
export const actFor = (c) => (c <= 4 ? 1 : c <= 8 ? 2 : 3);
export const actSettings = (a) => ACTS[a].settings;
export const defaultSetting = (c) =>
  [
    'island',
    'home',
    'village',
    'fields',
    'village',
    'city',
    'home',
    'harbour',
    'city',
    'village',
    'home',
  ][c];
export const WANTS = {
  Nothing: { wish: 'To want nothing at all.', shadow: 'You got it.' },
  Love: {
    wish: 'To be loved, completely.',
    shadow: 'Being loved completely means never being let go.',
  },
  Wealth: {
    wish: 'To never want for anything.',
    shadow: 'Everything gets a price, including people.',
  },
  Adventure: {
    wish: 'To never be bored.',
    shadow: 'Never bored means never home.',
  },
  Peace: {
    wish: 'To never be hurt.',
    shadow: 'Never hurt means never touched.',
  },
};
export const DEEP_TOPICS = {
  1: [
    'what they want to become',
    'what they would give up to leave home',
    'what they want from a friend',
  ],
  2: [
    'what they want from the person they share their life with',
    'what they would trade for success',
    'what they owe their parents',
  ],
  3: [
    'what they want to be remembered for',
    'what they would tell their eight-year-old self',
    'what they need to hear before the end',
  ],
};
export const YESNO_EXAMPLES = {
  1: ['Go to university?', 'Tell your father the truth?', 'Leave home?'],
  2: ['Take the promotion?', 'Have a child?', 'Visit your mother?'],
  3: ['Forgive him?', 'Sell the house?', 'Go back to the tree?'],
};
