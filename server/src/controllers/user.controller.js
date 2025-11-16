import { User } from '../models/users.model.js'

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Manager/Admin)

const getAllUsers = async (req, res) => {
  try {
    const { role, department, isActive, search } = req.body;

    const filters = {};

    if (role) filters.role = role;
    if (department) filters.department = department
    if (typeof isActive !== 'undefined') filters.isActive = isActive === 'true';

    if (search) {
      filters.$or = [
        {
          name: { $regex: search, $options: 'i' },
        },
        {
          email: { $regex: search, $options: 'i' },
        }
      ]
    }

    const users = await User.find(filters).select('-password');

    res.status(200).json({
      success: true,
      data: users
    })

  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    })
  }
}

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Manager/Admin)

const getUsersById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.status(200).json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Get User By Id Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user by ID',
      error: error.message
    })
  }
}

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)

const updateUser = async (req, res) => {
  try {
    const { name, email, role, department, isActive } = req.body;

    const user = await User.findOne(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role - role;
    if (department) user.department = department;
    if (typeof isActive !== 'undefined') user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    })
  }
}

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    //Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    })
  }
}

// @desc    Get agents for assignment
// @route   GET /api/users/agents/available
// @access  Private

const getAvailableAgents = async (req, res) => {
  try {
    const { department } = req.query;

    const filters = {
      role: { $in: ['agent', 'manager'] },
      isActive: true
    }

    if (department) {
      filters.department = department
    }

    const agents = await User.find(filters)
      .select('name email department role')
      .sort('name')

    res.status(200).json({
      success: true,
      data: agents
    });

  } catch (error) {
    console.error('Get Agents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents',
      error: error.message
    });
  }
}


export {
  getAllUsers,
  getUsersById,
  updateUser,
  deleteUser,
  getAvailableAgents
}