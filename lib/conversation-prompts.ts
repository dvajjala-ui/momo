// Original, optional prompts. Choosing one never creates a profile or sends a message.
export const PROMPT_THEMES=[
  {id:'food',label:'Food',prompts:[
    'Build a snack plate with three things that should never work together. What goes on it?',
    'If our table opened a tiny food stall for one day, what would we serve and call it?',
    'Which food would you happily learn to make badly before getting it right?',
    'Choose a snack for the interval of a very dramatic movie. What makes the cut?'
  ]},
  {id:'play',label:'Play',prompts:[
    'Invent one silly new rule for a game everyone here might know.',
    'Our gang has an imaginary trophy to give out today. What is it for?',
    'You get to teach us a five-minute skill. What would you pick?',
    'We have paper, a pen and ten minutes. What game should we make up?'
  ]},
  {id:'city',label:'Around town',prompts:[
    'Plan a tiny Ahmedabad adventure with just one stop for food and one thing to try.',
    'What ordinary public place would you put on a friend’s first-day city walk?',
    'Give a familiar part of the city a new, very unofficial nickname.',
    'What would you put in a small welcome kit for someone exploring Ahmedabad?'
  ]}
] as const;
