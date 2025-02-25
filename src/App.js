import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import AdminDashboard from './pages/AdminDashboard';
import QRGenerator from './pages/QRGenerator';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/order" element={<CustomerMenu />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/qr-generator" element={<QRGenerator />} />
      </Routes>
    </Router>
  );
}

export default App;