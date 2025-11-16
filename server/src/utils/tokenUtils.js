import jwt from 'jsonwebtoken'

// generate Access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
    }
  )
}

// Generate Refresh token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    }
  )
}

//Verify Access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET)
  } catch (error) {
    throw new Error("Invalid or expired access token")
  }
}

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch (error) {
    throw new Error("Invalid or expired refresh token")
  }
}

// Set tokens in cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // lax for dev,
    maxAge: 15 * 60 * 1000 // 15 minutes
  })

  // refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // lax for dev,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
}

// Clear token cookies
const clearTokenCookies = (res) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0)
  })
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0)
  })
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies
}