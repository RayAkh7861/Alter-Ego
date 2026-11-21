// OWNER: Person 1
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

const scaffoldPage = {
  title: 'A small beginning',
  narration: 'The first leaf catches the light. A path waits beneath the branches.',
  summaryLine: 'You began beneath a young tree.',
  choices: [
    { text: 'Follow the path', risk: 'good' },
    { text: 'Climb the old wall', risk: 'bad' },
  ],
};

app.post('/api/page', (_request, response) => {
  response.json(scaffoldPage);
});

app.post('/api/epitaph', (_request, response) => {
  response.json({
    epitaph: 'Here rests a life that left the branches brighter.',
    verdict: 'A life remembered.',
  });
});

app.listen(3001, () => {
  console.log('Leaves API listening on http://localhost:3001');
});
