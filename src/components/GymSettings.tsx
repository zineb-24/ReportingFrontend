import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdminHeader from './AdminHeader';
import '../styles/GymSettings.css';

interface Gym {
  id_salle: number;
  name: string;
  phone: string;
  admin_creator?: {
    id_user: number;
    name: string;
  };
  date_creation: string;
}

interface User {
  id_user: number;
  name: string;
  email?: string;
}

const GymSettings: React.FC = () => {
  const { gymId } = useParams<{ gymId: string }>();
  const navigate = useNavigate();
  const [gym, setGym] = useState<Gym | null>(null);
  const [linkedUsers, setLinkedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    const fetchGymData = async () => {
      try {
        setLoading(true);
        // Fetch gym details
        const gymResponse = await api.get(`/admin-dashboard/salles/${gymId}/`);
        setGym(gymResponse.data);
        setFormData({
          name: gymResponse.data.name,
          phone: gymResponse.data.phone || '',
        });

        // Fetch linked users
        const linkedUsersResponse = await api.get(`/admin-dashboard/salles/${gymId}/users/`);
        setLinkedUsers(linkedUsersResponse.data);

        // Fetch all available users
        const allUsersResponse = await api.get('/admin-dashboard/users/', {
          params: { role: 'user' }
        });
        setAvailableUsers(allUsersResponse.data);
      } catch (error) {
        console.error('Error fetching gym data:', error);
        setErrors({ form: 'Failed to load gym data' });
      } finally {
        setLoading(false);
      }
    };

    if (gymId) {
      fetchGymData();
    }
  }, [gymId]);

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
      // Update gym details
      await api.put(`/admin-dashboard/salles/${gymId}/`, {
        name: formData.name,
        phone: formData.phone,
      });
  
      // Show success message briefly before navigating away
      setErrors({ form: 'Gym updated successfully' });
      
      // Wait a short time to show the success message, then navigate back
      setTimeout(() => {
        // Navigate back to the previous page
        navigate(-1);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error updating gym:', error);
      if (error.response) {
        setErrors({
          form: `Failed to update gym: ${JSON.stringify(error.response.data)}`,
        });
      } else {
        setErrors({
          form: 'Failed to update gym. Please try again.',
        });
      }
      setSaving(false);
    }
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(e.target.value);
  };

  const addUser = async () => {
    if (!selectedUserId) return;

    try {
      setSaving(true);
      // Create user-gym link
      const linkData = {
        id_user: selectedUserId,
        id_salle: gymId,
      };

      await api.post('/admin-dashboard/links/create/', linkData);

      // Refresh linked users
      const linkedUsersResponse = await api.get(`/admin-dashboard/salles/${gymId}/users/`);
      setLinkedUsers(linkedUsersResponse.data);

      // Reset selection
      setSelectedUserId('');
    } catch (error) {
      console.error('Error adding user:', error);
      setErrors({ form: 'Failed to add user link' });
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (userId: number) => {
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

        // Refresh linked users
        const linkedUsersResponse = await api.get(`/admin-dashboard/salles/${gymId}/users/`);
        setLinkedUsers(linkedUsersResponse.data);
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setErrors({ form: 'Failed to remove user link' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGym = async () => {
    if (!window.confirm('Are you sure you want to delete this gym? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/admin-dashboard/salles/${gymId}/`);
      navigate('/admin-dashboard/gyms');
    } catch (error) {
      console.error('Error deleting gym:', error);
      setErrors({ form: 'Failed to delete gym' });
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
    return <div className="gs-loading-indicator">Loading gym data...</div>;
  }

  // Filter out users that are already linked
  const filteredAvailableUsers = availableUsers.filter(
    (user) => !linkedUsers.some((linkedUser) => linkedUser.id_user === user.id_user)
  );

  return (
    <div className="gs-admin-layout">
      <AdminHeader />
  
      <div className="gs-form-container">
        <div className="gs-form-title-bar">
          <h2>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="gs-settings-icon">
              <path
                fillRule="evenodd"
                d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                clipRule="evenodd"
              />
            </svg>
            Gym Settings
          </h2>
        </div>
  
        <div className="gs-gym-form-container">
          <form onSubmit={handleSubmit}>
            <div className="gs-form-layout">
              {/* Left Column - Gym Information */}
              <div className="gs-form-column">
                <h3 className="gs-section-title">Gym Information</h3>
                <div className="gs-form-section">
                  <div className="gs-form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'gs-error' : ''}
                    />
                    {errors.name && <div className="gs-error-message">{errors.name}</div>}
                  </div>
  
                  <div className="gs-form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'gs-error' : ''}
                    />
                    {errors.phone && <div className="gs-error-message">{errors.phone}</div>}
                  </div>
  
                  <div className="gs-form-group">
                    <label htmlFor="admin-creator">Admin Creator</label>
                    <input
                      type="text"
                      id="admin-creator"
                      value={gym?.admin_creator?.name || 'Unknown'}
                      readOnly
                      className="gs-readonly-field"
                    />
                  </div>
  
                  <div className="gs-form-group">
                    <label htmlFor="date-creation">Date of Creation</label>
                    <input
                      type="text"
                      id="date-creation"
                      value={gym?.date_creation ? formatDate(gym.date_creation) : 'Unknown'}
                      readOnly
                      className="gs-readonly-field"
                    />
                  </div>
                </div>
              </div>
  
              {/* Right Column - Linked Users */}
              <div className="gs-form-column">
                <h3 className="gs-section-title">Linked User(s)</h3>
                <div className="gs-form-section">
                  <div className="gs-linked-users">
                    {linkedUsers.length > 0 ? (
                      linkedUsers.map((user) => (
                        <div key={user.id_user} className="gs-linked-user-tag">
                          {user.name}
                          <button
                            type="button"
                            onClick={() => removeUser(user.id_user)}
                            className="gs-remove-user-btn"
                            disabled={saving}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="gs-trash-icon">
                              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="gs-no-users">No linked users</div>
                    )}
                  </div>
  
                  <div className="gs-add-user-section">
                    <h4 className="gs-add-user-title">Add User(s)</h4>
                    <div className="gs-user-select-container">
                      <select
                        value={selectedUserId}
                        onChange={handleUserSelect}
                        className="gs-user-select"
                        disabled={filteredAvailableUsers.length === 0 || saving}
                      >
                        <option value="">Select one or more option</option>
                        {filteredAvailableUsers.map((user) => (
                          <option key={user.id_user} value={user.id_user}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addUser}
                        className="gs-add-user-btn"
                        disabled={!selectedUserId || saving}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            {errors.form && (
              <div className={`gs-form-message ${errors.form.includes('successfully') ? 'gs-success' : 'gs-error'}`}>
                {errors.form}
              </div>
            )}
  
            <div className="gs-form-actions">
              <div className="gs-action-buttons-left">
                <button
                  type="button"
                  onClick={handleDeleteGym}
                  className="gs-delete-gym-button"
                  disabled={saving}
                >
                  Delete Gym
                </button>
              </div>
              <div className="gs-action-buttons-right">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="gs-cancel-button"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gs-confirm-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GymSettings;