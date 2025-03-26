import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdminHeader from './AdminHeader';
import '../styles/UserSettings.css';

interface User {
  id_user: number;
  name: string;
  email: string;
  phone: string;
  is_admin: boolean;
  is_active: boolean;
  admin_creator?: {
    id_user: number;
    name: string;
  };
  date_creation: string;
}

interface Gym {
  id_salle: number;
  name: string;
}

const UserSettings: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [linkedGyms, setLinkedGyms] = useState<Gym[]>([]);
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Fetch user details
        const userResponse = await api.get(`/admin-dashboard/users/${userId}/`);

        //For debugging
        console.log("Full user response:", userResponse.data);
      
        //For debugging
        console.log("admin_creator:", userResponse.data.admin_creator);
        console.log("date_creation:", userResponse.data.date_creation);

        setUser(userResponse.data);
        setFormData({
          name: userResponse.data.name,
          email: userResponse.data.email,
          phone: userResponse.data.phone || '',
        });

        // Fetch linked gyms
        const linkedGymsResponse = await api.get(`/admin-dashboard/users/${userId}/salles/`);
        setLinkedGyms(linkedGymsResponse.data);

        // Fetch all available gyms
        const allGymsResponse = await api.get('/admin-dashboard/salles/');
        setAvailableGyms(allGymsResponse.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setErrors({ form: 'Failed to load user data' });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!validateForm()) {
      return;
    }
  
    setSaving(true);
  
    try {
      // Update user details
      await api.put(`/admin-dashboard/users/${userId}/`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        is_active: user?.is_active,
      });
  
      // Show success message briefly before navigating away
      setErrors({ form: 'User updated successfully' });
      
      // Wait a short time to show the success message, then navigate back
      setTimeout(() => {
        // Navigate back to the previous page
        navigate(-1);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.response) {
        setErrors({
          form: `Failed to update user: ${JSON.stringify(error.response.data)}`,
        });
      } else {
        setErrors({
          form: 'Failed to update user. Please try again.',
        });
      }
      setSaving(false);
    }
  };

  const handleGymSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGymId(e.target.value);
  };

  const addGym = async () => {
    if (!selectedGymId) return;

    try {
      setSaving(true);
      // Create user-gym link
      const linkData = {
        id_user: userId,
        id_salle: selectedGymId,
      };

      await api.post('/admin-dashboard/links/create/', linkData);

      // Refresh linked gyms
      const linkedGymsResponse = await api.get(`/admin-dashboard/users/${userId}/salles/`);
      setLinkedGyms(linkedGymsResponse.data);

      // Reset selection
      setSelectedGymId('');
    } catch (error) {
      console.error('Error adding gym:', error);
      setErrors({ form: 'Failed to add gym link' });
    } finally {
      setSaving(false);
    }
  };

  const removeGym = async (gymId: number) => {
    try {
      setSaving(true);
      // First we need to find the link ID
      const linksResponse = await api.get('/admin-dashboard/links/', {
        params: { user_id: userId, salle_id: gymId },
      });

      if (linksResponse.data && linksResponse.data.length > 0) {
        const linkId = linksResponse.data[0].id;
        // Delete the link
        await api.delete(`/admin-dashboard/links/${linkId}/`);

        // Refresh linked gyms
        const linkedGymsResponse = await api.get(`/admin-dashboard/users/${userId}/salles/`);
        setLinkedGyms(linkedGymsResponse.data);
      }
    } catch (error) {
      console.error('Error removing gym:', error);
      setErrors({ form: 'Failed to remove gym link' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!user) return;
  
    try {
      setSaving(true);
      // Toggle is_active status
      const newActiveStatus = !user.is_active;
      
      await api.put(`/admin-dashboard/users/${userId}/`, {
        ...formData,
        is_active: newActiveStatus,
      });
  
      // Update local state
      setUser({
        ...user,
        is_active: newActiveStatus,
      });
    } catch (error) {
      console.error('Error toggling user active status:', error);
      setErrors({ form: `Failed to ${user.is_active ? 'deactivate' : 'activate'} user` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/admin-dashboard/users/${userId}/`);
      navigate('/admin-dashboard/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrors({ form: 'Failed to delete user' });
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Validate password inputs
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    try {
      setSaving(true);
      // API call to change password - without current password
      await api.put(`/admin-dashboard/users/${userId}/change-password/`, {
        new_password: passwordData.newPassword
      });
      
      // Close modal and show success message
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({ form: 'Password changed successfully' });
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setErrors({});
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.response?.data?.new_password) {
        setPasswordErrors({ newPassword: error.response.data.new_password[0] });
      } else {
        setPasswordErrors({ form: 'Failed to change password' });
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getFullYear()} at ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="us-loading-indicator">Loading user data...</div>;
  }

  // Filter out gyms that are already linked
  const filteredAvailableGyms = availableGyms.filter(
    (gym) => !linkedGyms.some((linkedGym) => linkedGym.id_salle === gym.id_salle)
  );

  return (
    <div className="us-admin-layout">
      <AdminHeader />
  
      <div className="us-form-container">
        <div className="us-form-title-bar">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="us-settings-icon">
              <path
                fillRule="evenodd"
                d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                clipRule="evenodd"
              />
            </svg>
            User Settings
          </h2>
        </div>
  
        <div className="us-user-form-container">
          <form onSubmit={handleSubmit}>
            <div className="us-form-layout">
              {/* Left Column - Account Information */}
              <div className="us-form-column">
                <h3 className="us-section-title">Account Information</h3>
                <div className="us-form-section">
                  <div className="us-form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'us-error' : ''}
                    />
                    {errors.name && <div className="us-error-message">{errors.name}</div>}
                  </div>
  
                  <div className="us-form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'us-error' : ''}
                    />
                    {errors.email && <div className="us-error-message">{errors.email}</div>}
                  </div>
  
                  <div className="us-form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'us-error' : ''}
                    />
                    {errors.phone && <div className="us-error-message">{errors.phone}</div>}
                  </div>
  
                  <div className="us-form-group">
                    <label htmlFor="admin-creator">Admin Creator</label>
                    <input
                      type="text"
                      id="admin-creator"
                      value={user?.admin_creator?.name || 'Unknown'}
                      readOnly
                      className="us-readonly-field"
                    />
                  </div>
  
                  <div className="us-form-group">
                    <label htmlFor="date-creation">Date of Creation</label>
                    <input
                      type="text"
                      id="date-creation"
                      value={user?.date_creation ? formatDate(user.date_creation) : 'Unknown'}
                      readOnly
                      className="us-readonly-field"
                    />
                  </div>
  
                  <div className="us-form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      value="************"
                      readOnly
                      className="us-readonly-field"
                    />
                    <button 
                      type="button" 
                      className="us-change-password-button" 
                      onClick={() => setShowPasswordModal(true)}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
  
              {/* Right Column - Linked Gyms */}
              <div className="us-form-column">
                <h3 className="us-section-title">Linked Gym(s)</h3>
                <div className="us-form-section">
                  <div className="us-linked-gyms">
                    {linkedGyms.length > 0 ? (
                      linkedGyms.map((gym) => (
                        <div key={gym.id_salle} className="us-linked-gym-tag">
                          {gym.name}
                          <button
                            type="button"
                            onClick={() => removeGym(gym.id_salle)}
                            className="us-remove-gym-btn"
                            disabled={saving}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="us-trash-icon">
                              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="us-no-gyms">No linked gyms</div>
                    )}
                  </div>
  
                  <div className="us-add-gym-section">
                    <h4 className="us-add-gym-title">Add Gym(s)</h4>
                    <div className="us-gym-select-container">
                      <select
                        value={selectedGymId}
                        onChange={handleGymSelect}
                        className="us-gym-select"
                        disabled={filteredAvailableGyms.length === 0 || saving}
                      >
                        <option value="">Select one or more option</option>
                        {filteredAvailableGyms.map((gym) => (
                          <option key={gym.id_salle} value={gym.id_salle}>
                            {gym.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addGym}
                        className="us-add-gym-btn"
                        disabled={!selectedGymId || saving}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            {errors.form && (
              <div className={`us-form-message ${errors.form.includes('successfully') ? 'us-success' : 'us-error'}`}>
                {errors.form}
              </div>
            )}
  
            <div className="us-form-actions">
              <div className="us-action-buttons-left">
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="us-delete-user-button"
                  disabled={saving}
                >
                  Delete User
                </button>
                <button
                  type="button"
                  onClick={handleDeactivateUser}
                  className={`us-deactivate-user-button ${user?.is_active ? 'us-deactivate' : 'us-activate'}`}
                  disabled={saving}
                >
                  {user?.is_active ? 'Deactivate User' : 'Activate User'}
                </button>
              </div>
              <div className="us-action-buttons-right">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="us-cancel-button"
                disabled={saving}
              >
                Cancel
              </button>
                <button
                  type="submit"
                  className="us-confirm-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
  
      {/* Password Change Modal - Without Current Password */}
      {showPasswordModal && (
        <div className="us-modal-overlay">
          <div className="us-modal">
            <div className="us-modal-header">
              <h3>Change Password</h3>
              <button 
                type="button" 
                className="us-modal-close" 
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>
            <div className="us-modal-content">
              <div className="us-form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className={passwordErrors.newPassword ? 'us-error' : ''}
                />
                {passwordErrors.newPassword && (
                  <div className="us-error-message">{passwordErrors.newPassword}</div>
                )}
              </div>
              <div className="us-form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className={passwordErrors.confirmPassword ? 'us-error' : ''}
                />
                {passwordErrors.confirmPassword && (
                  <div className="us-error-message">{passwordErrors.confirmPassword}</div>
                )}
              </div>
              {passwordErrors.form && (
                <div className="us-error-message">{passwordErrors.form}</div>
              )}
            </div>
            <div className="us-modal-footer">
              <button 
                type="button" 
                className="us-cancel-button" 
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="us-confirm-button" 
                onClick={handlePasswordChange}
                disabled={saving}
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;