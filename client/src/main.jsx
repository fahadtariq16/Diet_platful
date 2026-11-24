import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import './styles/global.css';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider } from './lib/toast.jsx';
import { Layout, RequireAuth } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Today from './pages/Today.jsx';
import Trends from './pages/Trends.jsx';
import Balance from './pages/Balance.jsx';
import Pathway from './pages/Pathway.jsx';
import Plan from './pages/Plan.jsx';
import Reviews from './pages/Reviews.jsx';
import NotFound from './pages/NotFound.jsx';

const guard = (el) => <RequireAuth>{el}</RequireAuth>;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/balance" element={<Balance />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/app" element={guard(<Today />)} />
                <Route path="/app/trends" element={guard(<Trends />)} />
                <Route path="/app/pathway" element={guard(<Pathway />)} />
                <Route path="/app/plan" element={guard(<Plan />)} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
);
