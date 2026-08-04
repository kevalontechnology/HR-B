require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const TechnicalQuestion = require('../models/TechnicalQuestion');
const AppliedProfile = require('../models/AppliedProfile');
const Skill = require('../models/Skill');

const questionsData = [
  // MERN Questions
  { text: "What is the Virtual DOM in React and how does reconciliation work?", skill: "React.js", profile: "MERN Stack Developer", diff: "Medium", ans: "In-memory Virtual DOM representation diffed via Fiber algorithm." },
  { text: "Explain Node.js Event Loop phases (Timers, Poll, Check).", skill: "Node.js", profile: "MERN Stack Developer", diff: "Hard", ans: "Event loop phases: timers, pending, idle, poll, check (setImmediate), close." },
  { text: "Difference between SQL and NoSQL indexing strategy in MongoDB?", skill: "MongoDB", profile: "MERN Stack Developer", diff: "Medium", ans: "MongoDB uses B-Trees for compound and single field indexes without schema locks." },
  { text: "What are React Hooks rules and how does useEffect cleanup run?", skill: "React.js", profile: "MERN Stack Developer", diff: "Easy", ans: "Call hooks at top level. Cleanup runs before re-effect or unmount." },
  { text: "Explain Express middleware chain and error handling middleware parameters.", skill: "Node.js", profile: "MERN Stack Developer", diff: "Easy", ans: "Error middleware requires 4 parameters: (err, req, res, next)." },
  { text: "What is Tailwind CSS utility-first approach?", skill: "React.js", profile: "MERN Stack Developer", diff: "Easy", ans: "Combines atomic CSS utility classes directly in component template." },
  { text: "How does JWT authentication work in REST APIs?", skill: "Node.js", profile: "MERN Stack Developer", diff: "Medium", ans: "Stateless tokens with Header, Payload, and Signature verified via secret." },
  { text: "Difference between useState and useReducer in React?", skill: "React.js", profile: "MERN Stack Developer", diff: "Medium", ans: "useState manages simple state; useReducer handles complex state transitions via actions." },
  { text: "What is Mongoose lean() query optimization?", skill: "MongoDB", profile: "MERN Stack Developer", diff: "Medium", ans: "Returns plain JS objects skipping Mongoose document instantiation for faster reads." },
  { text: "Explain CORS and how to handle it in Express.", skill: "Node.js", profile: "MERN Stack Developer", diff: "Easy", ans: "Sets Access-Control-Allow-Origin HTTP response headers." },

  // Python Django Questions
  { text: "Difference between select_related() and prefetch_related() in Django ORM?", skill: "Django", profile: "Python Django Developer", diff: "Hard", ans: "select_related performs SQL JOIN; prefetch_related does separate queries for multi-value relations." },
  { text: "Explain Python GIL (Global Interpreter Lock).", skill: "Python", profile: "Python Django Developer", diff: "Hard", ans: "Mutex preventing multiple native threads from executing Python bytecode simultaneously." },
  { text: "How to prevent SQL Injection in Django ORM?", skill: "Django", profile: "Python Django Developer", diff: "Medium", ans: "Django ORM automatically uses parameterized queries separating SQL from parameters." },
  { text: "Difference between INNER JOIN and LEFT JOIN in SQL?", skill: "Python", profile: "Python Django Developer", diff: "Easy", ans: "INNER JOIN returns matching rows in both; LEFT JOIN returns all left rows plus matching right rows." },
  { text: "What is DRF ModelSerializer?", skill: "Django", profile: "Python Django Developer", diff: "Easy", ans: "Converts Django QuerySets into JSON/XML payloads and validates incoming requests." }
];

const seedQuestions = async () => {
  try {
    await connectDB();
    console.log('[Question Seeder] Loading skills and profiles...');

    const skills = await Skill.find({});
    const profiles = await AppliedProfile.find({});

    const skillMap = {};
    skills.forEach(s => { skillMap[s.name] = s._id; });

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.title] = p._id; });

    const mernProfile = profiles[0]?._id;
    const defaultSkill = skills[0]?._id;

    console.log('[Question Seeder] Inserting questions...');
    for (const q of questionsData) {
      await TechnicalQuestion.create({
        questionText: q.text,
        profileId: profileMap[q.profile] || mernProfile,
        skillId: skillMap[q.skill] || defaultSkill,
        difficulty: q.diff,
        expectedAnswer: q.ans,
        status: 'Active'
      });
    }

    console.log('[Question Seeder] Questions seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Question Seeder Error]', err.message);
    process.exit(1);
  }
};

seedQuestions();
