import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdminHeader from '../components/AdminHeader';
import '../styles/AddGymForm.css';

interface User {
  id_user: number;
  name: string;
  is_admin?: boolean;
}

interface FormData {
  name: string;
  phone: string;
  linkedUsers: number[];
}

const AddGymForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    linkedUsers: []
  });
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch available users for selection
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin-dashboard/users/', {
          params: { role: 'user' }
        });
        const usersList = response.data.filter((user: User) => !user.is_admin);
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
    
    // Add click outside listener to close the users list
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowUsersList(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedUsers.some(selected => selected.id_user === user.id_user)
      );
      setFilteredUsers(filtered);
    }
  }, [users, selectedUsers, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSearchFocus = () => {
    setShowUsersList(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowUsersList(true);
  };

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.some(selected => selected.id_user === user.id_user)) {
      const newSelectedUsers = [...selectedUsers, user];
      setSelectedUsers(newSelectedUsers);
      setFormData({
        ...formData,
        linkedUsers: [...formData.linkedUsers, user.id_user]
      });
      setSearchTerm('');
    }
  };

  const removeUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(user => user.id_user !== userId));
    setFormData({
      ...formData,
      linkedUsers: formData.linkedUsers.filter(id => id !== userId)
    });
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
    
    setLoading(true);
    
    try {
      // Create gym
      const gymData = {
        name: formData.name,
        phone: formData.phone
      };
      
      console.log('Sending gym data:', gymData);
      const response = await api.post('/admin-dashboard/salles/create/', gymData);
      console.log('Gym created response:', response);
      
      // Make sure we have a valid ID from the response
      const newGymId = response.data.id_salle;
      console.log('New gym ID:', newGymId);
      
      // Only proceed if we got a valid gym ID
      if (!newGymId) {
        console.error('No gym ID returned from API');
        throw new Error('Failed to get gym ID');
      }
      
      // Create user links if any users selected
      if (formData.linkedUsers.length > 0) {
        console.log(`Creating links for ${formData.linkedUsers.length} users to gym ${newGymId}`);
        
        // Try each link one by one
        for (const userId of formData.linkedUsers) {
          try {
            console.log(`Linking user ${userId} to gym ${newGymId}`);
            
            // Make a separate request for each link
            const linkData = {
              id_user: userId,
              id_salle: newGymId
            };
            
            console.log('Link data being sent:', linkData);
            const linkResponse = await api.post('/admin-dashboard/links/create/', linkData);
            console.log('Link creation response:', linkResponse);
            
          } catch (linkError: any) {
            // Log the error but continue with other links
            console.error(`Error linking user ${userId} to gym ${newGymId}:`, linkError);
            
            // Show more details about the error
            if (linkError.response) {
              console.error('Status:', linkError.response.status);
              console.error('Response data:', linkError.response.data);
            }
          }
        }
      }
      
      // Navigate back to gyms list
      navigate('/admin-dashboard/gyms');
      
    } catch (error: any) {
      console.error('Error creating gym:', error);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        setErrors({
          form: `Failed to create gym: ${JSON.stringify(error.response.data)}`
        });
      } else {
        setErrors({
          form: 'Failed to create gym. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    navigate('/admin-dashboard/gyms');
  };

  return (
    <div className="agf-admin-layout">
      {/* Admin Dashboard Header */}
      <AdminHeader />
  
      <div className="agf-form-container">
        {/* Form Title */}
        <div className="agf-form-title-bar">
          <h2>+ Add New Gym</h2>
        </div>
        
        <div className="agf-add-gym-form-container">
          <form onSubmit={handleSubmit}>
            <div className="agf-form-layout">
              {/* Left Column - Link with Users */}
              <div className="agf-form-column">
                <h3 className="agf-section-title">Link with user(s)</h3>
                <div className="agf-form-section">
                  <div className="agf-form-group">
                    <label htmlFor="user-search">Add user(s)</label>
                    <div className="agf-user-search-container" ref={searchRef}>
                      <div className="agf-search-input-container">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="agf-search-icon">
                          <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                        </svg>
                        <input
                          type="text"
                          id="user-search"
                          placeholder="Search by name"
                          value={searchTerm}
                          onChange={handleSearchChange}
                          onFocus={handleSearchFocus}
                          className="agf-search-input"
                          style={{ textIndent: '1.5rem' }}
                        />
                      </div>
                      
                      {showUsersList && filteredUsers.length > 0 && (
                        <div className="agf-users-dropdown">
                          {filteredUsers.map(user => (
                            <div 
                              key={user.id_user} 
                              className="agf-user-option"
                              onClick={() => handleUserSelect(user)}
                            >
                              {user.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="agf-selected-users">
                      {selectedUsers.map(user => (
                        <div key={user.id_user} className="agf-selected-user-tag">
                          {user.name}
                          <button 
                            type="button" 
                            onClick={() => removeUser(user.id_user)}
                            className="agf-remove-user-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Gym Creation */}
              <div className="agf-form-column">
                <h3 className="agf-section-title">Gym Creation</h3>
                <div className="agf-form-section">
                  <div className="agf-form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Enter Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <div className="agf-error-message">{errors.name}</div>}
                  </div>
                  
                  <div className="agf-form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      placeholder="Enter Phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <div className="agf-error-message">{errors.phone}</div>}
                  </div>
                </div>
              </div>
            </div>
            
            {errors.form && <div className="agf-form-error">{errors.form}</div>}
            
            <div className="agf-form-actions">
              <button 
                type="button" 
                onClick={handleCancel} 
                className="agf-cancel-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="agf-add-gym-button"
                disabled={loading}
              >
                + Add Gym
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddGymForm;