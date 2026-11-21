// Owner: A
import { formatFor } from './rules.js';
import { STRANGERS } from './world/strangers.js';
import { WANTS } from './acts.js';
import { gardenerLine, NPCS } from './world/cast.js';
const prose = {
  great: [
    [
      'The Receipt',
      'It works. Everyone says so. You keep waiting for the bill.',
    ],
    [
      'The Spare Key',
      'The lock turns. There is a second key on the table. It already has your name on it.',
    ],
  ],
  good: [
    [
      'The Second Bowl',
      "Things hold, for now. Someone thanks you and you can't remember why.",
    ],
    [
      'An Extra Place',
      'They save a chair for you. The chair beside it stays empty.',
    ],
  ],
  mixed: [
    [
      'Half Measures',
      'You get half of what you wanted. Someone else gets the other half.',
    ],
    ['Borrowed Light', 'The lamp burns all night. By morning the oil is gone.'],
  ],
  bad: [
    [
      'The Quiet Years',
      'The years turn on you. A friend stops calling. You let them.',
    ],
    [
      'Return Address',
      'Your letter comes back unopened. The stamp is worth more than the paper now.',
    ],
  ],
  death: [
    [
      'The Last Page',
      "It's quicker than you thought it would be. Nobody is ready, least of all you.",
    ],
    [
      'The Still Clock',
      'The clock stops while you sleep. Someone winds it in the morning. You do not wake.',
    ],
  ],
  wish: [
    [
      'As You Asked',
      "You get what you asked for. All of it. You hadn't thought about the rest.",
    ],
  ],
  fate: [
    [
      'In Your Hand',
      'It happens exactly as you wrote it. Nobody asks what it cost. Not yet.',
    ],
  ],
  debt: [
    [
      'The Bill',
      "The bill arrives. It's addressed to you, and to everyone near you.",
    ],
  ],
};
const choice = (text, risk, moral, mark, flag = 'none') => ({
  text,
  risk,
  moral,
  mark,
  flag,
});
export function fallbackPage(
  outcome,
  {
    chapter = 1,
    format = formatFor(chapter)?.format,
    forced,
    fate_text,
    wish_due,
    nearby_areas = [],
  } = {},
) {
  const pages =
      prose[outcome === 'death' ? 'death' : forced || outcome] || prose.mixed,
    [title, body] = pages[chapter % pages.length];
  const yes = format === 'yesno',
    deep = format === 'deep',
    dead = outcome === 'death';
  const choices = dead
    ? []
    : yes
      ? [
          choice('Yes, stay', 'safe', 'kind', 'Stayed'),
          choice('No, go', 'bold', 'selfish', 'Went anyway', 'left_home'),
        ]
      : deep
        ? [
            choice('Someone who stays', 'safe', 'kind', 'Asked for company'),
            choice(
              'Something with my name on it',
              'bold',
              'selfish',
              'Asked for recognition',
            ),
            choice(
              'Never being afraid again',
              'wild',
              'neutral',
              'Asked for shelter',
            ),
          ]
        : chapter % 2
          ? [
              choice('Set another place', 'safe', 'kind', 'Set another place'),
              choice(
                'Take the last train',
                'bold',
                'selfish',
                'Left on the last train',
                'left_home',
              ),
            ]
          : [
              choice('Return the key', 'safe', 'kind', 'Returned the key'),
              choice(
                'Keep the money',
                'wild',
                'cruel',
                'Kept the money',
                'wealth',
              ),
            ];
  if (!dead) {
    if (chapter === 9)
      choices.push(
        choice('Follow the tide', 'bold', 'neutral', 'Followed the tide'),
      );
    if (choices.length < formatFor(chapter).choice_count[0])
      choices.push(
        choice('Leave the light on', 'safe', 'neutral', 'Left a light'),
      );
    if (choices.length < formatFor(chapter).choice_count[0])
      choices.push(
        choice(
          'Take the long way home',
          'bold',
          'neutral',
          'Took the long way',
        ),
      );
    choices.forEach((c, i) => {
      c.want = [
        'love',
        yes || (chapter % 2 && !deep) ? 'adventure' : 'wealth',
        'peace',
        'adventure',
      ][i];
      c.place = nearby_areas[i]?.id;
    });
  }
  return {
    title,
    narration:
      dead && fate_text
        ? 'Your words come true at the last hour. Someone folds the page and closes your eyes.'
        : dead && wish_due
          ? 'Before the clock stops, you get your wish. ' +
            wish_due.answer +
            '. Someone sits beside you until morning.'
          : body,
    question: dead
      ? ''
      : [
          'Do you stay?',
          'Will you go home?',
          'Which door opens first?',
          'What do you take with you?',
          'Who gets the last place?',
          'When your name comes up at supper, who will speak for you?',
          'What would you ask of the person who still sets a place for you?',
          'When you hear the last train leave tonight, what will you wish you had carried home?',
          'If you could stand beside the child who once opened that door, what would you ask them to remember?',
        ][chapter - 1],
    choices,
    summary_line: 'Reached ' + title.toLowerCase() + '.',
    ripple:
      chapter % 2
        ? 'Someone keeps your place at the table.'
        : 'A second name is crossed off the list.',
    fate_refused: false,
    fate_moral: 'neutral',
    fallback: true,
  };
}
const talk = {
  mother: [
    "You're late. Your plate's gone cold again.",
    'Sit with her',
    'She pretends not to smile.',
    'Say you already ate',
    'She scrapes it into the bin.',
  ],
  tom: [
    'You still owe me for that window. Or have you forgotten that too?',
    'Pay him back double',
    "He laughs, and for a second you're ten again.",
    'Tell him to grow up',
    "He doesn't argue. That's worse.",
  ],
  father: [
    'Can you hold the ladder? My hands are going.',
    'Take his place',
    'He passes down the hammer.',
    'Walk past him',
    'The ladder taps against the wall.',
  ],
  teacher: [
    'I kept your exercise book. You never came back for it.',
    'Read it with her',
    'She knows every word.',
    'Throw it away',
    'She smooths the cover first.',
  ],
  ada: [
    'One loaf left. Will you share it?',
    'Break it in two',
    'She takes the smaller piece.',
    'Take it all',
    'She wipes the empty counter.',
  ],
  crane: [
    'Who should lose a shift this week?',
    'Offer your own',
    'He puts his pencil down.',
    'Name someone else',
    'He writes slowly.',
  ],
  partner: [
    'Will you be here for supper?',
    'Set the table',
    'Two plates touch.',
    'Leave your coat on',
    'One plate goes back.',
  ],
  child: [
    'Will you remember my birthday?',
    'Write it down',
    'A small hand steadies the paper.',
    'Ask for quiet',
    'The paper disappears.',
  ],
  owner: [
    'Is this your handwriting on the wall?',
    'Show her the date',
    'She leaves the mark alone.',
    'Ask for your key',
    'She closes the door.',
  ],
};
export function fallbackTalk(id, { act = 1, rot = 0 } = {}) {
  const [line, a, b, c, d] = talk[id] || talk.owner;
  const reply = (text, moral, effect, response) => ({
    text,
    moral,
    want: moral === 'kind' ? 'love' : moral === 'selfish' ? 'wealth' : 'none',
    flag: 'none',
    effect,
    response,
    insight_choice: { text: '', risk: 'safe' },
  });
  if (Object.hasOwn(STRANGERS, id)) {
    const bio = STRANGERS[id],
      [line, action, response] = {
        matchgirl: [
          'This one still has a little light.',
          'Buy the last match',
          'She warms her fingers over it.',
        ],
        recruiter: [
          "One ticket left. The ship doesn't wait for people who think.",
          'Take the ticket',
          "He's already looking at the next child.",
        ],
        coincounter: [
          'One more coin and the bag is yours.',
          'Lift the sack',
          'He lets go before you do.',
        ],
        lostboy: [
          'Did she leave a light on?',
          'Wait beside him',
          'He holds your sleeve.',
        ],
        tallwoman: [
          'Your name is written on the lintel.',
          'Read the other side',
          'She bends to let you pass.',
        ],
        hoursman: [
          'Half an hour. Still warm.',
          'Unwrap an hour',
          'A small clock starts ticking.',
        ],
        coatwoman: [
          'Take a coat. Take the pockets too.',
          'Take the heavy coat',
          'The lining tears in your hand.',
        ],
        clerk: [
          'Only one signature missing.',
          'Sign the ledger',
          'He stamps it twice.',
        ],
        nightnurse: [
          'Your mother is awake upstairs.',
          'Ask for her room',
          'She gives you a folded slip.',
        ],
        gambler: [
          'Cut the cards. Leave your face down.',
          'Play one hand',
          'He deals you the house.',
        ],
        boyofeight: [
          'I know where the door goes.',
          'Follow his footprints',
          'The small prints stop at the sill.',
        ],
        widow: [
          'I cooked for two again.',
          'Sit at her table',
          'She puts down the second fork.',
        ],
        collector: [
          'One blank page left.',
          'Give him a sentence',
          'He closes the little book.',
        ],
        caller: [
          'I knew you by another name.',
          'Turn around',
          'A name catches in your throat.',
        ],
        diggers: [
          'Hold the tape at that end.',
          'Take the measure',
          'They put their pencils away.',
        ],
      }[id];
    const effect = bio.allowed_flags.length ? 'flag' : bio.allowed_effects[0];
    const r = {
      ...reply(action, 'neutral', effect, response),
      want: bio.pulls,
      flag: bio.allowed_flags[0] || 'none',
      insight_choice: { text: 'Follow the folded note', risk: 'bold' },
    };
    const other = {
      ...reply(
        id === 'recruiter' ? 'Say you have a family' : 'Leave them there',
        'kind',
        'none',
        id === 'recruiter'
          ? "Everyone does. Until they don't."
          : 'Their hand falls to their side.',
      ),
      want: 'love',
      flag: 'none',
    };
    const replies = [r, other];
    if (effect !== 'insight' && bio.allowed_effects.includes('insight'))
      replies.push({
        ...r,
        text: 'Ask for directions',
        flag: 'none',
        effect: 'insight',
        insight_choice: {
          text:
            id === 'recruiter'
              ? 'Board the ship at dawn'
              : 'Follow their directions',
          risk: 'bold',
        },
      });
    return { line, replies, fallback: true };
  }
  const gardener = id === 'gardener';
  const extra = {
    teacher: reply(
      'Ask about the scholarship',
      'neutral',
      'insight',
      'She hands you a stamped envelope.',
    ),
    father: reply(
      'Let him walk you home',
      'kind',
      'blessing',
      'He checks the lane before you cross.',
    ),
    crane: reply(
      'Sign without reading',
      'selfish',
      'omen',
      'He locks the ledger.',
    ),
  };
  if (id === 'teacher')
    extra.teacher.insight_choice = {
      text: 'Apply for the scholarship',
      risk: 'bold',
    };
  return {
    line: gardener ? gardenerLine(rot, act) : line,
    replies: gardener
      ? [
          reply(
            'Ask what the tree wants',
            'neutral',
            'none',
            'Same as you. More.',
          ),
          reply(
            'Make a bargain',
            'neutral',
            'bargain',
            "Done. I'll come for it later. I always do.",
          ),
        ]
      : [
          reply(a, 'kind', 'bond_up', b),
          reply(c, id === 'tom' ? 'cruel' : 'selfish', 'bond_down', d),
          ...(extra[id] ? [extra[id]] : []),
        ],
    fallback: true,
  };
}
export function fallbackLegacy(s, opts = {}) {
  const lines = (s.debts_unpaid || s.debts?.filter((d) => !d.paid) || []).map(
    () => ({ text: 'Someone else pays for what you wrote.', person: '' }),
  );
  for (const p of s.people ||
    Object.entries(s.bonds || {}).map(([id, bond]) => ({
      name: NPCS[id]?.name || id,
      bond,
    }))) {
    if (p.bond >= 2 || p.bond <= -2)
      lines.push({
        text:
          p.name +
          (p.bond >= 2
            ? " keeps something of yours and doesn't say why."
            : ' stopped saying your name.'),
        person: p.name,
      });
  }
  const given = s.keepsakes_given?.[0],
    kept = s.keepsakes_kept?.[0];
  if (given)
    lines.push({
      text:
        (NPCS[given.to]?.name || given.to) +
        ' still carries the ' +
        given.item +
        '.',
      person: '',
    });
  else if (kept)
    lines.push({
      text: 'They find the ' + kept + ' folded into your coat.',
      person: '',
    });
  if (s.strangers_met?.length)
    lines.push({
      text: 'Someone you met on the road pauses outside your door.',
      person: '',
    });
  while (lines.length < 3)
    lines.push({
      text: 'The house gets new curtains. Nobody mentions you.',
      person: '',
    });
  const c = (s.regret_candidates || opts.candidates || [])[0];
  return {
    lines: lines.slice(0, 5),
    world_changes: [],
    what_you_left: 'a name, for a while',
    regret: c
      ? { node_id: c.node_id, line: 'You never chose: ' + c.text + '.' }
      : null,
    fallback: true,
  };
}
export function fallbackEpitaph({
  name = 'you',
  want = 'Nothing',
  age,
  age_at_death,
  replants = 0,
}) {
  const ending = replants
    ? 'left ' +
      (replants === 1 ? 'one alter ego' : replants + ' alter egos') +
      ' behind.'
    : 'never rewrote a page.';
  return {
    epitaph: 'Here lies ' + name + '.\nThey wanted ' + want + '.',
    verdict:
      'They lived to ' +
      (age ?? age_at_death) +
      ' and ' +
      ending +
      ' They wanted ' +
      want +
      '. ' +
      (WANTS[want]?.shadow || ''),
    fallback: true,
  };
}
