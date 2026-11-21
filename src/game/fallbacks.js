// OWNER: Person 1
export const fallbackPages = {
  great: {title:'A Bright Turn',narration:'A rare chance comes your way, and you make the most of it. The future feels wide open.',summary_line:'You seized a rare chance.',choices:[{text:'Share your good fortune',risk:'safe'},{text:'Chase a bigger dream',risk:'wild'}]},
  good: {title:'A Gentle Season',narration:'Your effort pays off in a small but lasting way. Someone you care about notices.',summary_line:'Your efforts found a reward.',choices:[{text:'Build on what you have',risk:'safe'},{text:'Try something new',risk:'bold'}]},
  mixed: {title:'The Turning Path',narration:'You gain something you hoped for, but lose something else along the way. The next step is yours to choose.',summary_line:'You traded one hope for another.',choices:[{text:'Keep what remains',risk:'safe'},{text:'Take another chance',risk:'bold'}]},
  bad: {title:'Hard Years',narration:'The years turn against you. Plans fall through and a friend stops calling.',summary_line:'Your plans fell through.',choices:[{text:'Start over somewhere new',risk:'bold'},{text:'Hold on and wait',risk:'safe'}]},
  death: {title:'The Last Page',narration:'An unforeseen turn brings your journey to a close. The tree holds the shape of every choice you made.',summary_line:'Your life came to an end.',choices:[]},
};

export function fallbackPage(outcome) {
  return {...structuredClone(fallbackPages[outcome] || fallbackPages.mixed), fallback:true};
}

export function fallbackEpitaph({name='you',preference='a good life',age='?',replants=0}={}) {
  return {epitaph:`Here lies ${name}, who wanted ${preference} and lived to ${age}.\nThey rewrote their story ${replants} ${replants === 1 ? 'time' : 'times'}.`,verdict:'Only the tree can say what they found.',fallback:true};
}
