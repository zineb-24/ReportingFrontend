import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AllLinksTable.css';
import { useNavigate } from 'react-router-dom';

interface LinkData {
  id: number;
  admin_creator: {
    id_user: number;
    name: string;
  };
  id_user: {
    id_user: number;
    name: string;
  };
  id_salle: {
    id_salle: number;
    name: string;
  };
  date_creation: string;
}

const AllLinksTable: React.FC = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLinks, setTotalLinks] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const linksPerPage = 10; // Show 10 links per page

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin-dashboard/links/');
        setLinks(response.data);
        setFilteredLinks(response.data);
        setTotalLinks(response.data.length);
      } catch (error) {
        console.error('Error fetching links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  // Apply search and sort whenever links, searchTerm, or sortOrder changes
  useEffect(() => {
    let result = [...links];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(link => 
        link.id_user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.id_salle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.admin_creator.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting by date (newest first or oldest first)
    result.sort((a, b) => {
      const dateA = new Date(a.date_creation).getTime();
      const dateB = new Date(b.date_creation).getTime();
      if (sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
    
    setFilteredLinks(result);
    setTotalLinks(result.length);
    setCurrentPage(1); // Reset to first page when filters change
  }, [links, searchTerm, sortOrder]);

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
      // Format as DD-MM-YYYY at HH:MM
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  // Get current links for pagination
  const indexOfLastLink = currentPage * linksPerPage;
  const indexOfFirstLink = indexOfLastLink - linksPerPage;
  const currentLinks = filteredLinks.slice(indexOfFirstLink, indexOfLastLink);

  // Change page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < Math.ceil(totalLinks / linksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading links...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>All Links</h2>
      </div>

      <div className="all-links-table-container">
        <div className="all-links-header">
          {/* Search controls directly in the header */}
          <div className="all-links-search-container">
            <input 
              type="text" 
              placeholder="Search links..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="all-links-search-input"
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="all-links-search-icon">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Sort button for date */}
          <button onClick={toggleSortOrder} className="all-links-sort-button">
            {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="all-links-sort-icon">
              <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 01-1.06-1.06l3.75-3.75zm-3.75 9.75a.75.75 0 011.06 0L12 17.69l3.22-3.22a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="table-responsive">
          <table className="links-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Date Created</th>
                <th>Linked User</th>
                <th>Linked Gym</th>
              </tr>
            </thead>
            <tbody>
              {currentLinks.map((link) => (
                <tr key={link.id}>
                  <td>
                    <a href={`#/users/${link.admin_creator.id_user}`} className="admin-link">
                      {link.admin_creator.name}
                    </a>
                  </td>
                  <td>{formatDateCreated(link.date_creation)}</td>
                  <td>
                  <a 
                    href="#" 
                    className="user-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/admin-dashboard/users/${link.id_user.id_user}`);
                    }}
                  >
                    {link.id_user.name}
                  </a>
                  </td>
                  <td>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/admin-dashboard/gyms/${link.id_salle.id_salle}`);
                      }} 
                      className="gym-link"
                    >
                      {link.id_salle.name}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>{filteredLinks.length > 0 ? `${indexOfFirstLink + 1}-${Math.min(indexOfLastLink, totalLinks)} of ${totalLinks}` : 'No results'}</span>
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
              disabled={currentPage >= Math.ceil(totalLinks / linksPerPage)} 
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

export default AllLinksTable;