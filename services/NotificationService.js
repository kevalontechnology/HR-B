const NotificationTemplate = require('../models/NotificationTemplate');
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * Dispatches notifications based on template event keys
   */
  static async sendNotification({ eventKey, targetUserId, params = {} }) {
    try {
      const template = await NotificationTemplate.findOne({ eventKey, status: 'Active', isDeleted: false });
      if (!template) {
        // Fallback default message
        const fallbackTitle = `Event: ${eventKey.replace(/_/g, ' ')}`;
        const fallbackMsg = `System notification triggered for candidate ${params.candidateName || ''}.`;
        
        let targetUsers = [];
        if (targetUserId) {
          targetUsers = [targetUserId];
        } else {
          const allUsers = await User.find({ status: 'Active' });
          targetUsers = allUsers.map(u => u._id);
        }

        for (const uid of targetUsers) {
          await Notification.create({
            userId: uid,
            eventKey,
            title: fallbackTitle,
            message: fallbackMsg
          });
        }
        return;
      }

      let title = template.titleTemplate;
      let body = template.bodyTemplate;

      // Replace template variables
      Object.keys(params).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(regex, params[key]);
        body = body.replace(regex, params[key]);
      });

      let recipientUserIds = [];
      if (targetUserId) {
        recipientUserIds = [targetUserId];
      } else {
        const activeUsers = await User.find({ status: 'Active' });
        recipientUserIds = activeUsers.map(u => u._id);
      }

      for (const uid of recipientUserIds) {
        await Notification.create({
          userId: uid,
          eventKey,
          title,
          message: body
        });
      }
    } catch (err) {
      console.error('[NotificationService Error]', err.message);
    }
  }
}

module.exports = NotificationService;
