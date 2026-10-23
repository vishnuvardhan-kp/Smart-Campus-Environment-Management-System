import React from 'react';

const PageContainer = ({ children }) => {
  return (
    <main className="page-container">
      {children}
    </main>
  );
};

export default PageContainer;
