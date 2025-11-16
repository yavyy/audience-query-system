import { User } from '../models/users.model.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, setTokenCookies, clearTokenCookies } from '../utils/tokenUtils.js'


// @desc    Register new user
// @routes  POST /api/auth/register
//@access   Public

const register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'agent',
      department: department || 'general'
    })

    //Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    //Set tokens in cookies
    setTokenCookies(res, accessToken, refreshToken)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        },
        accessToken,
        refreshToken
      }
    })


  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    })
  }
}

//@desc   Login user
//@route  POST /api/auth/login
//@access Public

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      })
    }

    //Check for user (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user credentials'
      })
    }

    //Check if password matches
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user credentials'
      })
    }

    //Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      })
    }

    //generate tokend
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    //set tokens in cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successfull',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        },
        accessToken,
        refreshToken
      }
    })
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error login user',
      error: error.message
    })
  }
}

//@desc   Refresh access token
//@route  POST /api/auth/refresh
//@access Public (required refresh token)

const refreshAccessToken = async (req, res) => {
  try {
    let refreshToken;

    //Get refresh token from cookies or body
    if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    } else if (req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      })
    }

    //verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      })
    }

    //Get user
    const user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      })
    }

    //Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    //Set new access token in cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    })
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message
    })
  }
}

//@desc   logout user
//@route  POST /api/auth/logout
//@access Private

const logout = async (_, res) => {
  try {
    //Clear token cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'Looged out successfully'
    })
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    })
  }
}

//@desc   Get current logged in user
//@route  GET /api/auth/me
//@access Private

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    })
  }
}

//@desc   update user profile
//@route  PUT /api/auth/update-profile
//@access Private

const updateProfile = async (req, res) => {
  try {
    const { name, department } = req.body;

    let fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (department) fieldsToUpdate.department = department;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true, runValidators: true
      }
    )

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    })
  }
}

export {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  updateProfile
}