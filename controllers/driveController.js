const RecruitmentDrive = require('../models/RecruitmentDrive');
const NotificationService = require('../services/NotificationService');

exports.getAllDrives = async (req, res, next) => {
  try {
    const drives = await RecruitmentDrive.find({ isDeleted: false }).sort({ driveDate: -1 });
    res.json({ success: true, count: drives.length, data: drives });
  } catch (err) {
    next(err);
  }
};

exports.createDrive = async (req, res, next) => {
  try {
    const { driveName, driveCode, campusLocation, driveDate, status, description } = req.body;
    if (!driveName || !campusLocation || !driveDate) {
      return res.status(400).json({ success: false, message: 'Drive Name, Location, and Date are required.' });
    }

    const code = driveCode || `DRV-${Date.now().toString().slice(-4)}`;

    const drive = await RecruitmentDrive.create({
      driveName,
      driveCode: code.toUpperCase(),
      campusLocation,
      driveDate,
      status: status || 'Active',
      description,
      createdBy: req.user?._id
    });

    await NotificationService.sendNotification({
      eventKey: 'DRIVE_CREATED',
      targetUserId: null,
      params: { driveName, location: campusLocation }
    });

    res.status(201).json({ success: true, data: drive });
  } catch (err) {
    next(err);
  }
};

exports.updateDrive = async (req, res, next) => {
  try {
    const drive = await RecruitmentDrive.findById(req.params.id);
    if (!drive || drive.isDeleted) return res.status(404).json({ success: false, message: 'Drive not found.' });

    Object.assign(drive, req.body);
    await drive.save();

    res.json({ success: true, data: drive });
  } catch (err) {
    next(err);
  }
};

exports.deleteDrive = async (req, res, next) => {
  try {
    const drive = await RecruitmentDrive.findById(req.params.id);
    if (!drive || drive.isDeleted) return res.status(404).json({ success: false, message: 'Drive not found.' });

    drive.isDeleted = true;
    await drive.save();

    res.json({ success: true, message: 'Recruitment Drive deleted.' });
  } catch (err) {
    next(err);
  }
};
