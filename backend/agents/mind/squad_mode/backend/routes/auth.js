const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { credential, email, name, picture } = req.body;
  
  // Handle both credential (JWT) and direct user info formats
  let userEmail, userName, userPicture;
  
  if (credential) {
    // Handle JWT credential (implicit flow)
    try {
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
      userEmail = payload.email;
      userName = payload.name;
      userPicture = payload.picture;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid credential' });
    }
  } else if (email) {
    // Handle direct user info from Google API
    userEmail = email;
    userName = name;
    userPicture = picture;
  } else {
    return res.status(400).json({ message: 'Missing credential or user info' });
  }

  if (!userEmail) return res.status(400).json({ message: 'No email provided' });

  let user = await User.findOne({ email: userEmail });
  if (!user) {
    // Set role on creation only
    let role = 'user';
    if (userEmail === process.env.SUPERADMIN_USERNAME?.trim()) {
      role = 'superadmin';
    }
    user = await User.create({ email: userEmail, name: userName, picture: userPicture, role });
  } else {
    // Only update name and picture, never overwrite role
    let updated = false;
    if (user.name !== userName) {
      user.name = userName;
      updated = true;
    }
    if (user.picture !== userPicture) {
      user.picture = userPicture;
      updated = true;
    }
    if (updated) await user.save();
  }

  const token = jwt.sign({
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role
  }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({ token });
});

module.exports = router;