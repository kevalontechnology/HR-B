const TechnicalQuestion = require('../models/TechnicalQuestion');
const PracticalTask = require('../models/PracticalTask');

class InterviewService {
  /**
   * Selects random technical questions (default 10) for a given applied profile
   */
  static async getRandomTechnicalQuestions(profileId, count = 10) {
    let filter = { status: 'Active', isDeleted: false };
    if (profileId) {
      filter.profileId = profileId;
    }

    let questions = await TechnicalQuestion.find(filter).populate('skillId profileId');
    if (questions.length < count) {
      // Fallback: pick any active questions if not enough profile-specific ones exist
      questions = await TechnicalQuestion.find({ status: 'Active', isDeleted: false }).populate('skillId profileId');
    }

    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Selects random practical tasks (default 2) for a given applied profile
   */
  static async getRandomPracticalTasks(profileId, count = 2) {
    let filter = { status: 'Active', isDeleted: false };
    if (profileId) {
      filter.profileId = profileId;
    }

    let tasks = await PracticalTask.find(filter).populate('profileId');
    if (tasks.length < count) {
      tasks = await PracticalTask.find({ status: 'Active', isDeleted: false }).populate('profileId');
    }

    const shuffled = [...tasks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }
}

module.exports = InterviewService;
