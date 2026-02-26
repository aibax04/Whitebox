const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');
const router = express.Router();

// Get superadmin email from environment variable (trim spaces)
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME?.trim();

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

// Get current user from JWT
router.get('/me', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  res.json({ user: {
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    role: req.user.role
  }});
});

// Add user endpoint (superadmin/admin only)
router.post('/add-user', authMiddleware, async (req, res) => {
  const { email, role, name, picture } = req.body;
  const currentUser = req.user;
  if (!email || !role) return res.status(400).json({ message: 'Email and role are required' });
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Only superadmin or admin can add users' });
  }
  // Prevent duplicate
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });
  const newUser = await User.create({ email, role, name: name || '', picture: picture || '' });
  res.json({ message: 'User added', user: newUser });
});

router.get('/users', authMiddleware, async (req, res) => {
  const users = await User.find({}, 'email name role picture');
  res.json(users);
});

router.post('/change-role', authMiddleware, async (req, res) => {
  const { targetUsername, newRole } = req.body;
  const currentUser = req.user;

  const targetUser = await User.findOne({ email: targetUsername });
  if (!targetUser) return res.status(404).json({ message: 'User not found' });

  if (targetUser.name === SUPERADMIN_USERNAME) {
    return res.status(403).json({ message: 'Cannot modify superadmin' });
  }

  if (currentUser.role === 'admin' && newRole !== 'user') {
    return res.status(403).json({ message: 'Admins can only assign "user" role' });
  }

  if (currentUser.role === 'user') {
    return res.status(403).json({ message: 'Users cannot change roles' });
  }

  targetUser.role = newRole;
  await targetUser.save();
  res.json({ message: 'Role updated' });
});


// Delete user endpoint
router.delete('/delete-user/:email', authMiddleware, async (req, res) => {
  const { email } = req.params;
  const currentUser = req.user;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  // Prevent deleting superadmin
  if (email === SUPERADMIN_USERNAME) {
    return res.status(403).json({ message: 'Cannot delete superadmin' });
  }

  const targetUser = await User.findOne({ email });
  if (!targetUser) return res.status(404).json({ message: 'User not found' });

  // Only superadmin can delete any user; admin can only delete users
  if (currentUser.role === 'admin' && targetUser.role !== 'user') {
    return res.status(403).json({ message: 'Admins can only delete roles' });
  }
  if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Only superadmin or admin can delete roles' });
  }

  await User.deleteOne({ email });
  res.json({ message: 'User deleted' });
});

module.exports = router;
