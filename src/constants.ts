import { Puzzle, TeamData } from './types';

export const TEAM_PUZZLES: Record<number, Puzzle[]> = {
  1: [
    {
      id: 't1-p1',
      type: 'logic',
      question: "I am an odd number. Take away one letter from my name and I become even. What digit am I?",
      hint: "Think about the spelling of the numbers.",
      answer: "7" // Seven -> Even
    },
    {
      id: 't1-p2',
      type: 'visual',
      question: "In a digital sequence: 2, 4, 8, 16, 3X. What is the value of X?",
      hint: "Each number is double the previous.",
      answer: "2" // 32
    },
    {
      id: 't1-p3',
      type: 'physical',
      question: "Locate the 'Security Manual' (a black folder) in the room. On page 5, find the circled digit.",
      hint: "Check near the Game Master's station.",
      answer: "5"
    }
  ],
  2: [
    {
      id: 't2-p1',
      type: 'logic',
      question: "If 1=5, 2=25, 3=125, 4=625, then 5=?",
      hint: "Read the first part of the riddle again very carefully.",
      answer: "1" // 1=5, so 5=1
    },
    {
      id: 't2-p2',
      type: 'visual',
      question: "How many triangles are hidden in a standard 5-pointed star (pentagram)?",
      hint: "Count the small outer ones and the large inner ones.",
      answer: "5" // 5 points
    },
    {
      id: 't2-p3',
      type: 'physical',
      question: "One team member must balance a coin on their nose for 10 seconds. The Game Master will then reveal your digit.",
      hint: "Keep your head steady!",
      answer: "8"
    }
  ],
  3: [
    {
      id: 't3-p1',
      type: 'logic',
      question: "A sequence follows: 1, 1, 2, 3, 5, 8, 1X. What is the value of X?",
      hint: "Each number is the sum of the two before it.",
      answer: "3" // 13
    },
    {
      id: 't3-p2',
      type: 'visual',
      question: "Look at the clock on the wall. If it's exactly 9:00, what is the digit the small hand is pointing to?",
      hint: "The hour hand.",
      answer: "9"
    },
    {
      id: 't3-p3',
      type: 'physical',
      question: "As a team, perform a 'silent cheer' (no noise!) for 15 seconds. The Game Master will hold up a card.",
      hint: "High energy, zero decibels!",
      answer: "6"
    }
  ],
  4: [
    {
      id: 't4-p1',
      type: 'logic',
      question: "How many months in a year have 28 days?",
      hint: "Don't overthink it. Every month has at least 28 days.",
      answer: "2" // 12 -> last digit is 2? Or maybe just 12. Let's use 2 for simplicity of single digit.
    },
    {
      id: 't4-p2',
      type: 'visual',
      question: "In the 'Heist Blueprint' image, how many security cameras are marked with a red dot?",
      hint: "Count the red dots carefully.",
      answer: "4"
    },
    {
      id: 't4-p3',
      type: 'physical',
      question: "Find the hidden 'Laser Grid' (string across a doorway). Navigate through it without touching. The code is at the end.",
      hint: "Be agile like a cat.",
      answer: "0"
    }
  ]
};

export const INITIAL_TEAMS = (count: number): TeamData[] => {
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    const puzzles = TEAM_PUZZLES[id] || [
      { id: `t${id}-p1`, type: 'logic', question: "Default Logic Puzzle", hint: "Hint", answer: "1" },
      { id: `t${id}-p2`, type: 'visual', question: "Default Visual Puzzle", hint: "Hint", answer: "2" },
      { id: `t${id}-p3`, type: 'physical', question: "Default Physical Puzzle", hint: "Hint", answer: "3" },
    ];
    return {
      id,
      name: `Team ${id}`,
      puzzles,
      code: puzzles.map(p => p.answer).join(''),
      enteredCode: '',
      isSolved: false,
      startTime: null,
      solveTime: null,
      isClaimed: false,
      claimedBy: null
    };
  });
};
