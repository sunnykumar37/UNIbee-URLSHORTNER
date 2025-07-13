import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [links, setLinks] = useState(() => {
    try {
      const savedLinks = localStorage.getItem('links');
      return savedLinks ? JSON.parse(savedLinks) : [];
    } catch (error) {
      console.error('Error loading links from localStorage:', error);
      return [];
    }
  });
  const [qrCodes, setQrCodes] = useState(() => {
    try {
      const savedQrCodes = localStorage.getItem('qrCodesList');
      return savedQrCodes ? JSON.parse(savedQrCodes) : [];
    } catch (error) {
      console.error('Error loading QR codes from localStorage:', error);
      return [];
    }
  });
  const [pages, setPages] = useState(() => {
    try {
      const savedPages = localStorage.getItem('pages');
      return savedPages ? JSON.parse(savedPages) : [];
    } catch (error) {
      console.error('Error loading pages from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('links', JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    localStorage.setItem('qrCodesList', JSON.stringify(qrCodes));
  }, [qrCodes]);

  useEffect(() => {
    localStorage.setItem('pages', JSON.stringify(pages));
  }, [pages]);

  useEffect(() => {
    // Fetch all QR codes from backend on mount
    async function fetchQrCodes() {
      try {
        const res = await fetch('http://localhost:5000/api/qrcodes');
        const data = await res.json();
        setQrCodes(data);
      } catch (err) {
        console.error('Failed to fetch QR codes from backend:', err);
      }
    }
    fetchQrCodes();
  }, []);

  const addLink = (newLink) => {
    setLinks(prevLinks => {
      // Check if the link already exists to prevent duplication
      const exists = prevLinks.some(link => link._id === newLink._id);
      if (exists) {
        return prevLinks; // If it exists, return the current state unchanged
      }
      return [...prevLinks, newLink]; // Otherwise, add the new link
    });
  };

  const addQrCode = (newQrCode) => {
    setQrCodes(prevQrCodes => [...prevQrCodes, newQrCode]);
  };

  const deleteQrCode = (idToDelete) => {
    setQrCodes(prevQrCodes => prevQrCodes.filter(qr => qr.id !== idToDelete));
  };

  const addPage = (newPage) => {
    setPages(prevPages => [...prevPages, { ...newPage, content: newPage.content || [] }]);
  };

  const deletePage = (idToDelete) => {
    setPages(prevPages => prevPages.filter(page => page.id !== idToDelete));
  };

  const updatePage = (pageId, updatedPageData) => {
    setPages(prevPages => 
      prevPages.map(page => 
        page.id === pageId ? { ...page, ...updatedPageData } : page
      )
    );
  };

  const value = {
    links,
    qrCodes,
    pages,
    addLink,
    addQrCode,
    deleteQrCode,
    addPage,
    deletePage,
    updatePage,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
} 