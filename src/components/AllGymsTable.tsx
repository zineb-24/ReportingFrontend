import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AllGymsTable.css';
import { useNavigate } from 'react-router-dom';

interface GymData {
  id_salle: number;
  name: string;
  phone: string;
  date_creation: string;
  linked_users: {
    id_user: number;
    name: string;
  }[];
}

const AllGymsTable: React.FC = () => {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<GymData[]>([]);
  const [filteredGyms, setFilteredGyms] = useState<GymData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGyms, setTotalGyms] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const gymsPerPage = 10; // Show 10 gyms per page

  useEffect(() => {
    const fetchGyms = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin-dashboard/salles/');
        
        // For each gym, fetch their linked users
        const gymsWithUsers = await Promise.all(
          response.data.map(async (gym: any) => {
            try {
              const userResponse = await api.get(`/admin-dashboard/salles/${gym.id_salle}/users/`);
              return {
                ...gym,
                linked_users: userResponse.data || [],
              };
            } catch (error) {
              console.error(`Error fetching users for gym ${gym.id_salle}:`, error);
              return {
                ...gym,
                linked_users: [],
              };
            }
          })
        );
        
        setGyms(gymsWithUsers);
        setFilteredGyms(gymsWithUsers);
        setTotalGyms(gymsWithUsers.length);
      } catch (error) {
        console.error('Error fetching gyms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGyms();
  }, []);

  // Apply search and sort whenever gyms, searchTerm, or sortOrder changes
  useEffect(() => {
    let result = [...gyms];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(gym => 
        gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gym.phone.includes(searchTerm)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    
    setFilteredGyms(result);
    setTotalGyms(result.length);
    setCurrentPage(1); // Reset to first page when filters change
  }, [gyms, searchTerm, sortOrder]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Format the date creation timestamp to a readable format
  const formatDateCreated = (dateTimestamp: string): string => {
    try {
      const date = new Date(dateTimestamp);
      // Format as DD/MM/YYYY
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  // Get current gyms for pagination
  const indexOfLastGym = currentPage * gymsPerPage;
  const indexOfFirstGym = indexOfLastGym - gymsPerPage;
  const currentGyms = filteredGyms.slice(indexOfFirstGym, indexOfLastGym);

  // Change page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < Math.ceil(totalGyms / gymsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const addGym = () => {
    navigate('/admin-dashboard/add-gym');
  };

  if (loading) {
    return <div className="loading-indicator">Loading gyms...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>All Gyms</h2>
        <button onClick={addGym} className="add-gym-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="add-icon">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          Add Gym
        </button>
      </div>

      <div className="all-gyms-table-container">
        <div className="all-gyms-header">
          {/* Search controls directly in the header */}
          <div className="all-gyms-search-container">
            <input 
              type="text" 
              placeholder="Search gyms..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="all-gyms-search-input"
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="all-gyms-search-icon">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Only the A-Z sorting button */}
          <button onClick={toggleSortOrder} className="all-gyms-sort-button">
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="all-gyms-sort-icon">
              <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 01-1.06-1.06l3.75-3.75zm-3.75 9.75a.75.75 0 011.06 0L12 17.69l3.22-3.22a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="table-responsive">
          <table className="gyms-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Linked Users</th>
                <th>Phone Number</th>
                <th>Date Created</th>
              </tr>
            </thead>
            <tbody>
              {currentGyms.map((gym) => (
                <tr key={gym.id_salle}>
                  <td>
                    <a href={`#/gyms/${gym.id_salle}`} className="gym-link">
                      {gym.name}
                    </a>
                  </td>
                  <td>
                    {gym.linked_users.length > 0 ? (
                      <div className="linked-users">
                        {gym.linked_users.map((user, index) => (
                          <a href={`#/users/${user.id_user}`} key={user.id_user} className="user-link">
                            {user.name}
                            {index < gym.linked_users.length - 1 && <br />}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="no-users">No linked users</span>
                    )}
                  </td>
                  <td>{gym.phone}</td>
                  <td className="date-created">{formatDateCreated(gym.date_creation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>{filteredGyms.length > 0 ? `${indexOfFirstGym + 1}-${Math.min(indexOfLastGym, totalGyms)} of ${totalGyms}` : 'No results'}</span>
          <div className="pagination-buttons">
            <button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 1} 
              className="pagination-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="pagination-icon">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={goToNextPage} 
              disabled={currentPage >= Math.ceil(totalGyms / gymsPerPage)} 
              className="pagination-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="pagination-icon">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllGymsTable;