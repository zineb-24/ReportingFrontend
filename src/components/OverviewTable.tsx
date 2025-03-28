import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/OverviewTable.css';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UserTableData {
  id_user: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  last_login: string | null;
  linked_gyms: {
    id_salle: number;
    name: string;
  }[];
}

const UserOverviewTable: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserTableData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserTableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const usersPerPage = 10;

  // Format the last login timestamp to a readable format (e.g., "3 hours ago")
  const formatLastLogin = (lastLoginTimestamp: string | null): string => {
    if (!lastLoginTimestamp) return 'Never';
    
    try {
      const lastLogin = new Date(lastLoginTimestamp);
      return formatDistanceToNow(lastLogin, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting last login time:', error);
      return 'Unknown';
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users with role=user parameter to get only regular users
        const response = await api.get('/admin-dashboard/users/', {
          params: { role: 'user' }
        });
        
        // For each user, fetch their linked gyms
        const usersWithGyms = await Promise.all(
          response.data.map(async (user: any) => {
            try {
              const gymResponse = await api.get(`/admin-dashboard/users/${user.id_user}/salles/`);
              return {
                ...user,
                linked_gyms: gymResponse.data || [],
                // Use actual is_active status from the user data
                is_active: user.is_active !== undefined ? user.is_active : true,
                // Use the actual last_login from the user data
              };
            } catch (error) {
              console.error(`Error fetching gyms for user ${user.id_user}:`, error);
              return {
                ...user,
                linked_gyms: [],
                is_active: user.is_active !== undefined ? user.is_active : false
              };
            }
          })
        );

        // Filter out admin users (as a backup in case the API doesn't filter properly)
        const regularUsers = usersWithGyms.filter(user => !user.is_admin);
        
        setUsers(regularUsers);
        setFilteredUsers(regularUsers);
        setTotalUsers(regularUsers.length);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply search and sort whenever users, searchTerm, or sortOrder changes
  useEffect(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    setFilteredUsers(result);
    setTotalUsers(result.length);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, sortOrder]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Change page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < Math.ceil(totalUsers / usersPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading user data...</div>;
  }

  return (
    <div className="overview-table-container">
      <div className="overview-header">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="overview-icon">
            <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75c-1.036 0-1.875-.84-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75C3.84 21.75 3 20.91 3 19.875v-6.75z" />
          </svg>
          Users Overview
        </h3>
        
        {/* Search and Sort Controls */}
        <div className="table-controls">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="search-icon">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
          <button onClick={toggleSortOrder} className="sort-button">
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="sort-icon">
                <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 01-1.06-1.06l3.75-3.75zm-3.75 9.75a.75.75 0 011.06 0L12 17.69l3.22-3.22a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="users-table">
        <thead>
        <tr>
            <th>Users</th>
            <th>Linked Gyms</th>
            <th>Last Login</th>
            <th className="active-column-header">Active</th>
        </tr>
        </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user.id_user}>
                <td>
                <a 
                  href="#" 
                  className="user-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/admin-dashboard/users/${user.id_user}`);
                  }}
                >
                  {user.name}
                </a>
                </td>
                <td>
                  {user.linked_gyms.length > 0 ? (
                    <div className="linked-gyms">
                      {user.linked_gyms.map((gym, index) => (
                        <a 
                          href="#" 
                          key={gym.id_salle} 
                          className="gym-link"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/admin-dashboard/gyms/${gym.id_salle}`);
                          }}
                        >
                          {gym.name}
                          {index < user.linked_gyms.length - 1 && <br />}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="no-gyms">No linked gyms</span>
                  )}
                </td>
                <td className={
                  !user.last_login ? 'never-login' :
                  new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'recent-login' : 'old-login'
                }>
                  {formatLastLogin(user.last_login)}
                </td>
                <td>
                  {user.is_active ? (
                    <div className="active-indicator">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="active-icon">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="inactive-indicator">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inactive-icon">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>{filteredUsers.length > 0 ? `${indexOfFirstUser + 1}-${Math.min(indexOfLastUser, totalUsers)} of ${totalUsers}` : 'No results'}</span>
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
            disabled={currentPage >= Math.ceil(totalUsers / usersPerPage)} 
            className="pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="pagination-icon">
              <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserOverviewTable;