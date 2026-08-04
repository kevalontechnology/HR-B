const Employee = require('../models/Employee');
const Panel = require('../models/Panel');
const Candidate = require('../models/Candidate');
const ActivityLog = require('../models/ActivityLog');
const NotificationService = require('./NotificationService');

class AutoAssignService {
  /**
   * Smart auto assignment for candidate interviewers.
   * Rules:
   * 1. Check Applied Profile & Candidate required skills
   * 2. Find Panels / Employees matching panelType ('Technical', 'Practical', 'HR')
   * 3. Filter interviewers who are Active, Available, and currentQueueCount < capacity
   * 4. Pick the interviewer with the lowest currentQueueCount (least busy)
   * 5. Fallback or manual override flag available
   */
  static async assignCandidateToInterviewer(candidateId, panelType, forceInterviewerId = null) {
    const candidate = await Candidate.findById(candidateId).populate('appliedProfileId skills');
    if (!candidate) throw new Error('Candidate not found');

    let selectedInterviewer = null;

    if (forceInterviewerId) {
      selectedInterviewer = await Employee.findById(forceInterviewerId);
      if (!selectedInterviewer) throw new Error('Specified interviewer not found');
    } else {
      // Find candidate's required skill IDs
      const requiredSkillIds = (candidate.appliedProfileId?.requiredSkills || []).map(s => s.toString());
      
      // Find active panels for panelType
      const panels = await Panel.find({ 
        panelType, 
        status: 'Active',
        isDeleted: false 
      }).populate('members targetSkills');

      // Collect potential interviewer IDs
      let eligibleEmployeeIds = new Set();

      for (const panel of panels) {
        for (const member of panel.members) {
          if (member.status === 'Active' && member.availability !== 'Offline') {
            eligibleEmployeeIds.add(member._id.toString());
          }
        }
      }

      // Query eligible employees
      let eligibleEmployees = await Employee.find({
        _id: { $in: Array.from(eligibleEmployeeIds) },
        status: 'Active',
        isDeleted: false
      }).populate('skills roleId');

      if (eligibleEmployees.length === 0) {
        // Fallback: search all active employees with matching role or skills
        eligibleEmployees = await Employee.find({
          status: 'Active',
          isDeleted: false
        }).populate('skills roleId');
      }

      // Filter by capacity and availability
      const availableEmployees = eligibleEmployees.filter(emp => {
        const isNotOverCapacity = emp.currentQueueCount < emp.capacity;
        return isNotOverCapacity && emp.availability !== 'Offline';
      });

      if (availableEmployees.length > 0) {
        // Sort by skill match count descending, then currentQueueCount ascending
        availableEmployees.sort((a, b) => {
          const aSkills = (a.skills || []).map(s => s._id.toString());
          const bSkills = (b.skills || []).map(s => s._id.toString());

          const aMatch = requiredSkillIds.filter(id => aSkills.includes(id)).length;
          const bMatch = requiredSkillIds.filter(id => bSkills.includes(id)).length;

          if (bMatch !== aMatch) {
            return bMatch - aMatch; // Higher skill match first
          }
          return a.currentQueueCount - b.currentQueueCount; // Least busy first
        });

        selectedInterviewer = availableEmployees[0];
      }
    }

    if (selectedInterviewer) {
      if (panelType === 'Technical') {
        candidate.assignedTechnicalInterviewer = selectedInterviewer._id;
        candidate.stage = 'TECHNICAL_QUEUE';
      } else if (panelType === 'Practical') {
        candidate.assignedPracticalInterviewer = selectedInterviewer._id;
        candidate.stage = 'PRACTICAL_QUEUE';
      } else if (panelType === 'HR') {
        candidate.assignedHrInterviewer = selectedInterviewer._id;
        candidate.stage = 'HR_QUEUE';
      }

      await candidate.save();

      // Increment interviewer queue counter
      selectedInterviewer.currentQueueCount = (selectedInterviewer.currentQueueCount || 0) + 1;
      await selectedInterviewer.save();

      // Log activity
      await ActivityLog.create({
        module: 'AUTO_ASSIGN',
        action: 'ASSIGN_INTERVIEWER',
        description: `Candidate ${candidate.fullName} (${candidate.candidateCode}) auto-assigned to ${selectedInterviewer.fullName} for ${panelType} interview.`
      });

      // Dispatch Notification
      await NotificationService.sendNotification({
        eventKey: 'CANDIDATE_ASSIGNED',
        targetUserId: selectedInterviewer._id,
        params: {
          candidateName: candidate.fullName,
          candidateCode: candidate.candidateCode,
          stageName: panelType,
          interviewerName: selectedInterviewer.fullName
        }
      });

      return {
        success: true,
        assignedInterviewer: selectedInterviewer,
        candidate
      };
    } else {
      // No interviewer available right now; keep in queue
      await ActivityLog.create({
        module: 'AUTO_ASSIGN',
        action: 'QUEUE_WAITING',
        description: `Candidate ${candidate.fullName} placed in ${panelType} waiting queue (no active interviewer immediately available).`
      });

      return {
        success: false,
        message: `No active interviewer currently available for ${panelType}. Candidate placed in queue.`,
        candidate
      };
    }
  }
}

module.exports = AutoAssignService;
