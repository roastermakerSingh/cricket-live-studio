import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import StudioPage from './pages/StudioPage';
import MobilePage from './pages/MobilePage';
import WatchPage from './pages/WatchPage';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<SetupPage />} />
      <Route path="/studio/:roomId" element={<StudioPage />} />
      <Route path="/mobile/:roomId" element={<MobilePage />} />
      <Route path="/watch/:roomId" element={<WatchPage />} />
    </Routes>
  </BrowserRouter>
);
