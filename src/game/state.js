// OWNER: Person 1
import {CHAPTERS,toneWord,mulberry32,rollOutcome} from './rules.js';
import {fetchPage} from './ai.js';

const SAVE_KEY = 'leaves-game';

export function saveGame(game) {
  try { localStorage.setItem(SAVE_KEY,JSON.stringify(game)); } catch { /* Storage may be unavailable. */ }
}

export function loadGame() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch { return null; }
}

export function newGame(name='you',preference='Adventure',seed) {
  const game = {
    seed:Number.isInteger(seed) ? seed : Math.floor(Math.random()*0x100000000),
    rollCount:0,name:String(name || 'you').trim() || 'you',preference,
    luck:70,replants:0,lifeNumber:1,life:1,status:'alive',nodes:{},currentId:'n0',erasedMemories:[],
  };
  game.nodes.n0 = {id:'n0',parentId:null,life:1,chapter:0,ages:CHAPTERS[0].ages,
    title:'The Treehouse',narration:'You are born beneath a great tree. Years pass, and you climb its ladder to a bare treehouse. The door waits before you.',
    choices:[{text:'Step inside',risk:'safe'}],chosenIndex:null,outcome:null,
    summaryLine:'You grew up beneath the great tree.',dead:false,fallback:false};
  saveGame(game);
  return game;
}

export function lifePath(game) {
  const path = [];
  let node = game.nodes[game.currentId];
  while (node) { path.unshift(node); node = game.nodes[node.parentId]; }
  return path;
}

export function buildSummary(game) {
  return lifePath(game).map(node => node.summaryLine).filter(Boolean);
}

export async function choose(game,nodeId,choiceIndex) {
  if (game.status !== 'alive' || nodeId !== game.currentId) throw new Error('Choice must be on the current living page');
  const parent = game.nodes[nodeId];
  if (!Number.isInteger(choiceIndex) || !parent.choices[choiceIndex] || parent.chosenIndex !== null) throw new Error('Invalid or already used choice');
  const chapter = parent.chapter + 1;
  if (!CHAPTERS[chapter]) throw new Error('No chapters remain');
  const rng = mulberry32(game.seed);
  for (let index=0; index<game.rollCount; index++) rng();
  const next = () => { game.rollCount++; return rng(); };
  const outcome = rollOutcome(game.luck,chapter,parent.choices[choiceIndex].risk,next);
  const page = await fetchPage({name:game.name,preference:game.preference,chapter,ages:CHAPTERS[chapter].ages,
    tone:toneWord(game.luck),rot:game.replants,summary:buildSummary(game),
    last_choice:parent.choices[choiceIndex].text,outcome,erased_memories:game.erasedMemories});
  const id = `n${Math.max(-1,...Object.keys(game.nodes).map(key => Number(key.slice(1))))+1}`;
  parent.chosenIndex = choiceIndex;
  game.nodes[id] = {id,parentId:nodeId,life:game.lifeNumber,chapter,ages:CHAPTERS[chapter].ages,
    title:page.title,narration:page.narration,choices:page.choices,chosenIndex:null,
    outcome,choiceIndex,summaryLine:page.summary_line,dead:false,fallback:!!page.fallback};
  game.currentId = id;
  if (outcome === 'death') game.status = game.replants === 3 ? 'crumbled' : 'dead';
  saveGame(game);
  return game.nodes[id];
}

export function canReplant(game) { return game.status === 'dead' && game.replants < 3; }

export function replantCost(game) {
  return {luck:[game.luck,Math.max(0,game.luck-20)],rot:[game.replants,game.replants+1],
    replantsLeft:[3-game.replants,2-game.replants]};
}

export async function replant(game,nodeId,choiceIndex) {
  if (!canReplant(game)) throw new Error('This life cannot be replanted');
  const path = lifePath(game);
  const point = path.findIndex(node => node.id === nodeId);
  if (point < 0 || point === path.length-1) throw new Error('Select a previous node on the latest life');
  const node = path[point];
  if (!Number.isInteger(choiceIndex) || !node.choices[choiceIndex] || node.chosenIndex === choiceIndex ||
      Object.values(game.nodes).some(child => child.parentId === nodeId && child.choiceIndex === choiceIndex)) {
    throw new Error('Select a different choice');
  }
  for (const old of path.slice(point+1)) {
    old.dead = true;
    if (old.summaryLine) game.erasedMemories.push(old.summaryLine);
  }
  node.chosenIndex = null;
  game.luck = Math.max(0,game.luck-20);
  game.replants++;
  game.lifeNumber++;
  game.life = game.lifeNumber;
  game.currentId = nodeId;
  game.status = 'alive';
  saveGame(game);
  return choose(game,nodeId,choiceIndex);
}
