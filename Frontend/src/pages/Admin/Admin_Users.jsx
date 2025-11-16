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
    role: 'sports_committee'
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
        role: 'sports_committee'
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
    // Remove pending and approved filters, keep role filters
    if (filter === 'sports_committee') return user.role === 'sports_committee';
    if (filter === 'admin') return user.role === 'admin';
    return true;
  }).filter(user => {
    if (!searchTerm) return true;
    return (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Format role for display
  const formatRole = (role) => {
    return role === 'sports_committee' ? 'Sports Committee' : 'Admin';
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>User Management</h1>
          <p>Manage Sports Committee and admin accounts</p>
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
                    <option value="sports_committee">Sports Committee Only</option>
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
                                {formatRole(user.role)}
                              </span>
                            </div>
                            <div className="bracket-card-info">
                              <div className="user-email">{user.email}</div>
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
                                  {formatRole(user.role)}
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
                            <td colSpan="4" className="bracket-no-brackets">
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
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '24px', 
              borderBottom: '1px solid var(--border-color)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaUserPlus style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '600' }}>
                  Create New User
                </h2>
              </div>
              <button 
                onClick={() => setShowCreateUser(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  padding: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px', 
                  transition: 'all 0.2s ease',
                  fontSize: '24px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-secondary)';
                  e.target.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-muted)';
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Info Card */}
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '24px', 
                border: '1px solid rgba(59, 130, 246, 0.2)' 
              }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>
                  Add a new Sports Committee or admin account to the system
                </div>
              </div>

              <form onSubmit={handleCreateUser}>
                {/* Full Name */}
                <div style={{ marginBottom: '20px' }}>
                  <label 
                    htmlFor="username"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Enter full name"
                    value={createUserData.username}
                    onChange={handleCreateUserChange}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none',
                      transition: 'var(--transition)',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Email Address */}
                <div style={{ marginBottom: '20px' }}>
                  <label 
                    htmlFor="email"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter email address"
                    value={createUserData.email}
                    onChange={handleCreateUserChange}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none',
                      transition: 'var(--transition)',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label 
                    htmlFor="password"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Create password"
                    value={createUserData.password}
                    onChange={handleCreateUserChange}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none',
                      transition: 'var(--transition)',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {createUserData.password && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      background: 'var(--background-secondary)',
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--primary-color)'
                    }}>
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Password must contain:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                        <li style={{
                          marginBottom: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: passwordStrength.hasMinLength ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {passwordStrength.hasMinLength ? '✓' : '✗'} At least 8 characters
                        </li>
                        <li style={{
                          marginBottom: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: passwordStrength.hasUppercase ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {passwordStrength.hasUppercase ? '✓' : '✗'} One uppercase letter
                        </li>
                        <li style={{
                          marginBottom: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: passwordStrength.hasLowercase ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {passwordStrength.hasLowercase ? '✓' : '✗'} One lowercase letter
                        </li>
                        <li style={{
                          marginBottom: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: passwordStrength.hasNumber ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {passwordStrength.hasNumber ? '✓' : '✗'} One number
                        </li>
                        <li style={{
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: passwordStrength.hasSpecialChar ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {passwordStrength.hasSpecialChar ? '✓' : '✗'} One special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label 
                    htmlFor="confirmPassword"
                    style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      fontSize: '14px' 
                    }}
                  >
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={createUserData.confirmPassword}
                    onChange={handleCreateUserChange}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      outline: 'none',
                      transition: 'var(--transition)',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Select Role */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    color: 'var(--text-primary)', 
                    fontWeight: '600', 
                    fontSize: '14px' 
                  }}>
                    Select Role *
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('admin')}
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${createUserData.role === 'admin' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        background: createUserData.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'var(--background-secondary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'var(--transition)',
                        color: createUserData.role === 'admin' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        fontSize: '14px'
                      }}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('sports_committee')}
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${createUserData.role === 'sports_committee' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        background: createUserData.role === 'sports_committee' ? 'rgba(59, 130, 246, 0.1)' : 'var(--background-secondary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'var(--transition)',
                        color: createUserData.role === 'sports_committee' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        fontSize: '14px'
                      }}
                    >
                      Sports Committee
                    </button>
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '30px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid var(--border-color)' 
                }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    style={{ 
                      flex: 1,
                      padding: '12px 24px', 
                      background: 'var(--background-secondary)', 
                      color: 'var(--text-primary)', 
                      border: '2px solid var(--border-color)', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s ease' 
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUserLoading}
                    style={{ 
                      flex: 1,
                      padding: '12px 24px', 
                      background: createUserLoading ? 'var(--text-muted)' : 'var(--primary-color)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      cursor: createUserLoading ? 'not-allowed' : 'pointer', 
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: createUserLoading ? 0.7 : 1
                    }}
                  >
                    {createUserLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Creating User...
                      </>
                    ) : (
                      <>
                        <FaUserPlus /> Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;