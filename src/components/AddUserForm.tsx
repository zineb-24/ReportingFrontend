import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdminHeader from '../components/AdminHeader'; // Import the shared header
import '../styles/AddUserForm.css';

interface Gym {
  id_salle: number;
  name: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  linkedGyms: number[];
}

const AddUserForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirmation: '',
    linkedGyms: []
  });
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGyms, setSelectedGyms] = useState<Gym[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available gyms for selection
    const fetchGyms = async () => {
      try {
        const response = await api.get('/admin-dashboard/salles/');
        setGyms(response.data);
      } catch (error) {
        console.error('Error fetching gyms:', error);
      }
    };

    fetchGyms();
  }, []);

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

  const handleGymSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = gyms.find(gym => gym.id_salle === parseInt(e.target.value));
    if (selectedOption && !selectedGyms.some(gym => gym.id_salle === selectedOption.id_salle)) {
      setSelectedGyms([...selectedGyms, selectedOption]);
      setFormData({
        ...formData,
        linkedGyms: [...formData.linkedGyms, selectedOption.id_salle]
      });
      
      // Reset select value
      e.target.value = '';
    }
  };

  const removeGym = (gymId: number) => {
    setSelectedGyms(selectedGyms.filter(gym => gym.id_salle !== gymId));
    setFormData({
      ...formData,
      linkedGyms: formData.linkedGyms.filter(id => id !== gymId)
    });
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
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match';
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
      // Create user
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        is_admin: false  // Regular user by default
      };
      
      console.log('Sending user data:', userData);
      const response = await api.post('/admin-dashboard/users/create/', userData);
      console.log('User created successfully:', response.data);
      
      // IMPORTANT: Make sure we have a valid userId from the response
      const newUserId = response.data.id_user;
      console.log('New user ID:', newUserId);
      
      // Create gym links if any gyms selected
      if (formData.linkedGyms.length > 0 && newUserId) {
        for (const gymId of formData.linkedGyms) {
          try {
            // Make sure both fields are explicitly included in the request
            const linkData = {
              id_user: newUserId,
              id_salle: gymId
            };
            console.log('Creating link with data:', linkData);
            
            const linkResponse = await api.post('/admin-dashboard/links/create/', linkData);
            console.log('Link created successfully:', linkResponse.data);
          } catch (linkError: any) {
            console.error('Error creating link:', linkError);
            if (linkError.response) {
              console.error('Link error details:', linkError.response.data);
            }
          }
        }
      }
      
      // Navigate back to users list
      navigate('/admin-dashboard/users');
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      if (error.response) {
        console.error('Error response data:', error.response.data);
        setErrors({
          form: `Failed to create user: ${JSON.stringify(error.response.data)}`
        });
      } else {
        setErrors({
          form: 'Failed to create user. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    navigate('/admin-dashboard/users');
  };

  return (
    <div className="admin-layout">
      {/* Admin Dashboard Header */}
      <AdminHeader />

      <div className="form-container">
        {/* Form Title - This was missing */}
        <div className="form-title-bar">
          <h2>+ Add New User</h2>
        </div>
        
        <div className="add-user-form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-layout">
              {/* Left Column */}
              <div className="form-column">
                <h3 className="section-title">Account Creation</h3>
                <div className="form-section">
                  <div className="form-group">
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
                    {errors.name && <div className="error-message">{errors.name}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Enter Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}
                  </div>
                  
                  <div className="form-group">
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
                    {errors.phone && <div className="error-message">{errors.phone}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      placeholder="Enter Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'error' : ''}
                    />
                    {errors.password && <div className="error-message">{errors.password}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="passwordConfirmation">Password Confirmation</label>
                    <input
                      type="password"
                      id="passwordConfirmation"
                      name="passwordConfirmation"
                      placeholder="Enter Password Again"
                      value={formData.passwordConfirmation}
                      onChange={handleInputChange}
                      className={errors.passwordConfirmation ? 'error' : ''}
                    />
                    {errors.passwordConfirmation && <div className="error-message">{errors.passwordConfirmation}</div>}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="form-column">
                <h3 className="section-title">Link with Gym(s)</h3>
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="gym-select">Add Gym (s)</label>
                    <select 
                      id="gym-select" 
                      onChange={handleGymSelect}
                      value=""
                      className="gym-select"
                    >
                      <option value="" disabled>Select one or more option</option>
                      {gyms.map(gym => (
                        <option key={gym.id_salle} value={gym.id_salle}>
                          {gym.name}
                        </option>
                      ))}
                    </select>
                    
                    <div className="selected-gyms">
                      {selectedGyms.map(gym => (
                        <div key={gym.id_salle} className="selected-gym-tag">
                          {gym.name}
                          <button 
                            type="button" 
                            onClick={() => removeGym(gym.id_salle)}
                            className="remove-gym-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {errors.form && <div className="form-error">{errors.form}</div>}
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleCancel} 
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="add-user-button"
                disabled={loading}
              >
                + Add User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserForm;