import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import '../../style/admin_Users.css';
import { FaTrash, FaSearch, FaUserPlus } from 'react-icons/fa';

const AdminUsers = ({ sidebarOpen }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Create user form state
  const [createUserData, setCreateUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowSearch(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    }
  }, [user, filter, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/users');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch users. Please try again.');
      setLoading(false);
      console.error('Error fetching users:', error);
    }
  };

  // Validate password strength
  const validatePasswordStrength = (password) => {
    return {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  // Handle create user form changes
  const handleCreateUserChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'password') {
      setPasswordStrength(validatePasswordStrength(value));
    }

    setCreateUserData({
      ...createUserData,
      [name]: value
    });
  };

  // Handle role selection
  const handleRoleSelect = (role) => {
    setCreateUserData({
      ...createUserData,
      role: role
    });
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (createUserData.password !== createUserData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Strong password validation
    const strength = validatePasswordStrength(createUserData.password);
    if (!strength.hasMinLength) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!strength.hasUppercase) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!strength.hasLowercase) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    if (!strength.hasNumber) {
      setError('Password must contain at least one number');
      return;
    }
    if (!strength.hasSpecialChar) {
      setError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
      return;
    }

    setCreateUserLoading(true);

    try {
      const { confirmPassword, ...userData } = createUserData;
      
      // Call admin create user endpoint
      await API.post('/admin/users/create', userData);
      
      setSuccess('User created successfully! The account is automatically approved.');
      
      // Reset form
      setCreateUserData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff'
      });
      setPasswordStrength({
        hasMinLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      });
      
      setShowCreateUser(false);
      fetchUsers(); // Refresh users list
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await API.delete(`/admin/users/${userId}`);
        setSuccess('User deleted successfully!');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Failed to delete user.');
        console.error('Error deleting user:', error);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return !user.is_approved;
    if (filter === 'approved') return user.is_approved;
    if (filter === 'staff') return user.role === 'staff';
    if (filter === 'admin') return user.role === 'admin';
    return true;
  }).filter(user => {
    if (!searchTerm) return true;
    return (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const pendingUsersCount = users.filter(user => !user.is_approved).length;

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>User Management</h1>
          <p>Manage staff and admin accounts</p>
        </div>
        
        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Alerts */}
            {error && (
              <div className="bracket-error">
                {error}
                <button onClick={() => setError('')} className="bracket-alert-close">&times;</button>
              </div>
            )}
            
            {success && (
              <div className="bracket-success">
                {success}
                <button onClick={() => setSuccess('')} className="bracket-alert-close">&times;</button>
              </div>
            )}

            {/* Filter and Search Controls */}
            <div className="bracket-view-section">
              <div className="user-management-toolbar">
                <div className="filter-controls">
                  <select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                    className="bracket-form-group select-filter"
                  >
                    <option value="all">All Users</option>
                    <option value="pending">Pending Approval ({pendingUsersCount})</option>
                    <option value="approved">Approved</option>
                    <option value="staff">Staff Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                  
                  <div className="search-create-container">
                    {isMobile ? (
                      <div className="mobile-search-container">
                        <button 
                          className="bracket-submit-btn search-toggle-btn"
                          onClick={() => setShowSearch(!showSearch)}
                        >
                          <FaSearch />
                        </button>
                        {showSearch && (
                          <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="search-input"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={() => setShowCreateUser(true)}
                      className="bracket-submit-btn create-user-btn"
                    >
                      <FaUserPlus />
                      Create New User
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bracket-loading">
                  <div className="bracket-spinner"></div>
                  <p>Loading users...</p>
                </div>
              ) : (
                <div className="users-table-container">
                  {isMobile ? (
                    <div className="bracket-grid">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div key={user.id} className="bracket-card user-card">
                            <div className="bracket-card-header">
                              <h3>{user.username}</h3>
                              <span className={`bracket-sport-badge ${user.role}`}>
                                {user.role}
                              </span>
                            </div>
                            <div className="bracket-card-info">
                              <div className="user-email">{user.email}</div>
                              <div className="user-status">
                                <span className={`status-badge ${user.is_approved ? 'approved' : 'pending'}`}>
                                  {user.is_approved ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            <div className="bracket-card-actions">
                              <button 
                                onClick={() => deleteUser(user.id)}
                                className="bracket-delete-btn"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bracket-no-brackets">
                          No users found matching your criteria
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(user => (
                            <tr key={user.id}>
                              <td>{user.username}</td>
                              <td>{user.email}</td>
                              <td>
                                <span className={`bracket-sport-badge ${user.role}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${user.is_approved ? 'approved' : 'pending'}`}>
                                  {user.is_approved ? 'Approved' : 'Pending'}
                                </span>
                              </td>
                              <td>
                                <div className="bracket-card-actions">
                                  <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="bracket-delete-btn"
                                    title="Delete"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="bracket-no-brackets">
                              No users found matching your criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>Create New User</h2>
                <p className="modal-subtitle">Add a new staff or admin account to the system</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowCreateUser(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="auth-form create-user-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="Enter full name"
                  value={createUserData.username}
                  onChange={handleCreateUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter email address"
                  value={createUserData.email}
                  onChange={handleCreateUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Create password"
                  value={createUserData.password}
                  onChange={handleCreateUserChange}
                  required
                />
                {createUserData.password && (
                  <div className="password-requirements">
                    <p className="requirements-title">Password must contain:</p>
                    <ul className="requirements-list">
                      <li className={passwordStrength.hasMinLength ? 'valid' : 'invalid'}>
                        {passwordStrength.hasMinLength ? '✓' : '✗'} At least 8 characters
                      </li>
                      <li className={passwordStrength.hasUppercase ? 'valid' : 'invalid'}>
                        {passwordStrength.hasUppercase ? '✓' : '✗'} One uppercase letter
                      </li>
                      <li className={passwordStrength.hasLowercase ? 'valid' : 'invalid'}>
                        {passwordStrength.hasLowercase ? '✓' : '✗'} One lowercase letter
                      </li>
                      <li className={passwordStrength.hasNumber ? 'valid' : 'invalid'}>
                        {passwordStrength.hasNumber ? '✓' : '✗'} One number
                      </li>
                      <li className={passwordStrength.hasSpecialChar ? 'valid' : 'invalid'}>
                        {passwordStrength.hasSpecialChar ? '✓' : '✗'} One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm password"
                  value={createUserData.confirmPassword}
                  onChange={handleCreateUserChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Role</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-btn ${createUserData.role === 'admin' ? 'active' : ''}`}
                    onClick={() => handleRoleSelect('admin')}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${createUserData.role === 'staff' ? 'active' : ''}`}
                    onClick={() => handleRoleSelect('staff')}
                  >
                    Staff
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCreateUser(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn create-submit-btn"
                  disabled={createUserLoading}
                >
                  {createUserLoading ? (
                    <>
                      <div className="spinner-small"></div>
                      Creating User...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;