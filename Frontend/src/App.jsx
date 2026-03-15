// ═══════════════════════════════════════════════════════════════
//  Railway Ticket Sharing Platform - Complete Frontend App
//  Single App.jsx file with all routing, state, and UI
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── API Config ───────────────────────────────────────────────
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
API.interceptors.request.use(config => {
  const token = localStorage.getItem('rts_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth Context ─────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── Global Styles (injected via style tag) ───────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --ink:        #0d0f1a;
      --ink-soft:   #2a2d3e;
      --mist:       #6b7080;
      --cloud:      #f0f2f8;
      --white:      #ffffff;
      --rail:       #e8334a;
      --rail-dark:  #c4192f;
      --rail-glow:  rgba(232,51,74,0.18);
      --gold:       #f5a623;
      --teal:       #00b8a9;
      --card-bg:    rgba(255,255,255,0.85);
      --card-border: rgba(232,51,74,0.12);
      --shadow-sm:  0 2px 12px rgba(13,15,26,0.08);
      --shadow-md:  0 8px 32px rgba(13,15,26,0.12);
      --shadow-lg:  0 20px 60px rgba(13,15,26,0.18);
      --radius:     16px;
      --radius-sm:  10px;
      --transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--cloud);
      color: var(--ink);
      min-height: 100vh;
      line-height: 1.6;
    }

    h1,h2,h3,h4,h5 { font-family: 'Syne', sans-serif; line-height: 1.2; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--cloud); }
    ::-webkit-scrollbar-thumb { background: var(--rail); border-radius: 3px; }

    /* Navbar */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(232,51,74,0.15);
      padding: 0 clamp(16px,4vw,48px);
      height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: var(--shadow-sm);
    }

    .logo {
      display: flex; align-items: center; gap: 10px;
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 1.3rem;
      color: var(--ink); text-decoration: none; cursor: pointer;
    }
    .logo-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, var(--rail), var(--rail-dark));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; color: white;
      box-shadow: 0 4px 12px var(--rail-glow);
    }
    .logo span { color: var(--rail); }

    .nav-right { display: flex; align-items: center; gap: 12px; }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 22px; border-radius: var(--radius-sm);
      font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.9rem;
      cursor: pointer; border: none; transition: var(--transition);
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--rail), var(--rail-dark));
      color: white;
      box-shadow: 0 4px 15px var(--rail-glow);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px var(--rail-glow); }
    .btn-outline {
      background: transparent; color: var(--ink);
      border: 1.5px solid rgba(13,15,26,0.2);
    }
    .btn-outline:hover { border-color: var(--rail); color: var(--rail); background: var(--rail-glow); }
    .btn-ghost {
      background: transparent; color: var(--mist); border: none; padding: 8px 14px;
    }
    .btn-ghost:hover { color: var(--rail); background: var(--rail-glow); border-radius: var(--radius-sm); }
    .btn-sm { padding: 8px 16px; font-size: 0.82rem; }
    .btn-full { width: 100%; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

    /* Dropdown menu */
    .profile-menu { position: relative; }
    .profile-trigger {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; border-radius: var(--radius-sm);
      background: var(--rail-glow); border: 1.5px solid var(--card-border);
      cursor: pointer; transition: var(--transition);
      font-weight: 600; font-size: 0.9rem; color: var(--ink);
    }
    .profile-trigger:hover { border-color: var(--rail); }
    .profile-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--rail), var(--gold));
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.85rem;
    }
    .dropdown {
      position: absolute; right: 0; top: calc(100% + 8px);
      background: var(--white); border-radius: var(--radius);
      box-shadow: var(--shadow-lg); border: 1px solid var(--card-border);
      min-width: 200px; overflow: hidden; z-index: 100;
      animation: dropIn 0.2s ease;
    }
    @keyframes dropIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    .dropdown-item {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px; cursor: pointer;
      transition: var(--transition); font-size: 0.9rem;
      border: none; background: none; width: 100%; text-align: left;
      color: var(--ink);
    }
    .dropdown-item:hover { background: var(--cloud); color: var(--rail); }
    .dropdown-item.danger { color: #e8334a; }
    .dropdown-item.danger:hover { background: var(--rail-glow); }
    .dropdown-divider { height: 1px; background: var(--cloud); margin: 4px 0; }

    /* Hero / Landing */
    .hero {
      min-height: 100vh;
      background: linear-gradient(160deg, #0d0f1a 0%, #1a1d30 40%, #2a1520 100%);
      display: flex; flex-direction: column;
      padding-top: 68px;
      position: relative; overflow: hidden;
    }
    .hero-bg-pattern {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(circle at 20% 50%, rgba(232,51,74,0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(245,166,35,0.08) 0%, transparent 40%),
        radial-gradient(circle at 60% 80%, rgba(0,184,169,0.08) 0%, transparent 35%);
    }
    .hero-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
    }
    .hero-content {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 60px clamp(16px,5vw,80px) 40px;
      position: relative; z-index: 1; text-align: center;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(232,51,74,0.15); border: 1px solid rgba(232,51,74,0.3);
      border-radius: 100px; padding: 6px 16px; margin-bottom: 28px;
      font-size: 0.82rem; color: #ff8090; font-weight: 500; letter-spacing: 0.05em;
    }
    .hero-title {
      font-size: clamp(2.2rem, 6vw, 4.2rem);
      font-weight: 800; color: white; margin-bottom: 20px;
      line-height: 1.1;
    }
    .hero-title em { color: var(--rail); font-style: normal; }
    .hero-sub {
      font-size: clamp(1rem, 2vw, 1.15rem);
      color: rgba(255,255,255,0.55); max-width: 560px; margin-bottom: 40px;
    }

    /* Search Box */
    .search-box {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px; padding: 28px;
      width: 100%; max-width: 800px; margin: 0 auto;
    }
    .search-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px; align-items: end;
    }
    @media (max-width: 700px) { .search-grid { grid-template-columns: 1fr; } }

    /* Main content area */
    .main-content {
      padding-top: 68px;
      min-height: 100vh;
    }

    /* Page sections */
    .section {
      padding: clamp(32px,5vw,60px) clamp(16px,5vw,80px);
    }

    .section-title {
      font-size: 1.6rem; font-weight: 700; margin-bottom: 8px;
    }
    .section-sub {
      color: var(--mist); font-size: 0.95rem; margin-bottom: 32px;
    }

    /* Cards grid */
    .tickets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    /* Ticket Card */
    .ticket-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.35s cubic-bezier(.21,.6,.35,1), 
              box-shadow 0.35s ease, 
              border-color 0.35s ease;
  position: relative;
  will-change: transform;
  transform-origin: center;
}

.ticket-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 22px 60px rgba(13,15,26,0.22);
  border-color: rgba(232,51,74,0.35);
}
    .ticket-card-header {
      background: linear-gradient(135deg, #0d0f1a, #1a1d30);
      padding: 20px 22px 16px;
      color: white;
      position: relative;
    }
    .ticket-route {
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
    }
    .ticket-station { font-weight: 700; font-size: 1.1rem; }
    .ticket-station-label { font-size: 0.72rem; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.05em; }
    .route-arrow {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .route-line {
      height: 2px; width: 100%;
      background: linear-gradient(90deg, transparent, var(--rail), transparent);
      position: relative;
    }
    .route-line::after {
  content: '🚂';
  position: absolute;
  top: 50%;
  left: -10px;
  transform: translateY(-50%);
  font-size: 0.9rem;
  background: #1a1d30;
  padding: 0 4px;
  transition: left 0.8s cubic-bezier(.21,.6,.35,1);
}
  .ticket-card:hover .route-line::after {
  left: calc(100% - 10px);
}
    .ticket-train-info {
      font-size: 0.8rem; opacity: 0.6;
      display: flex; gap: 16px; margin-top: 4px;
    }
    .ticket-date-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  background: rgba(232,51,74,0.18);
  border: 1px solid rgba(232,51,74,0.3);

  border-radius: 8px;
  padding: 4px 10px;

  font-size: 0.75rem;
  color: #ff8090;
  font-weight: 600;

  margin-bottom: 10px;
  width: fit-content;
}
    .ticket-card-body { padding: 20px 22px; }
    .ticket-meta {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
    }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 100px;
      font-size: 0.78rem; font-weight: 500;
    }
    .chip-class { background: #e8f4fd; color: #1565c0; }
    .chip-status-confirmed { background: #e8f5e9; color: #2e7d32; }
    .chip-status-rac { background: #fff8e1; color: #f57f17; }
    .chip-status-waiting { background: #fce4ec; color: #c62828; }
    .chip-passenger { background: #f3e5f5; color: #6a1b9a; }
    .blur-field {
      filter: blur(5px); user-select: none;
      background: var(--cloud); border-radius: 6px; padding: 8px 12px;
      font-size: 0.85rem; color: var(--mist);
      display: flex; align-items: center; gap: 6px;
    }
    .ticket-price {
      font-size: 1.5rem; font-weight: 800; color: var(--rail);
      font-family: 'Syne', sans-serif;
    }
    .ticket-price-label { font-size: 0.75rem; color: var(--mist); }
    .ticket-card-footer {
      padding: 12px 22px 20px;
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid var(--cloud);
    }
    .contact-reveal {
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
      border: 1px solid #a5d6a7;
      border-radius: var(--radius-sm); padding: 14px 16px;
      margin-top: 14px;
    }
    .contact-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem; color: #1b5e20; font-weight: 500;
      padding: 4px 0;
    }

    /* Forms */
    .form-wrapper {
      background: var(--white);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: clamp(24px, 4vw, 48px);
      width: 100%; max-width: 560px; margin: 0 auto;
    }
    .form-title {
      font-size: 1.8rem; font-weight: 800; margin-bottom: 6px;
    }
    .form-sub { color: var(--mist); margin-bottom: 28px; font-size: 0.95rem; }

    .form-group { margin-bottom: 18px; }
    .form-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }
    @media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }

    label {
      display: block; font-weight: 600; font-size: 0.85rem;
      margin-bottom: 6px; color: var(--ink-soft);
    }
    input, select, textarea {
      width: 100%; padding: 12px 16px;
      border: 1.5px solid rgba(13,15,26,0.12);
      border-radius: var(--radius-sm);
      font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
      color: var(--ink); background: var(--cloud);
      transition: var(--transition); outline: none;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--rail);
      background: white;
      box-shadow: 0 0 0 3px var(--rail-glow);
    }
    input::placeholder { color: var(--mist); }

    .error-msg {
      color: var(--rail); font-size: 0.82rem; margin-top: 6px;
      display: flex; align-items: center; gap: 4px;
    }
    .success-msg {
      color: #2e7d32; font-size: 0.82rem; margin-top: 6px;
      display: flex; align-items: center; gap: 4px;
    }
    .alert {
      padding: 14px 18px; border-radius: var(--radius-sm);
      margin-bottom: 16px; font-size: 0.9rem; font-weight: 500;
    }
    .alert-error { background: #fce4ec; color: #c62828; border: 1px solid #ef9a9a; }
    .alert-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }

    /* Auth page */
    .auth-page {
      min-height: 100vh; padding-top: 68px;
      display: flex; align-items: center; justify-content: center;
      padding: 90px 16px 40px;
      background: linear-gradient(160deg, var(--cloud) 0%, white 100%);
    }
    .auth-toggle {
      text-align: center; margin-top: 20px;
      font-size: 0.9rem; color: var(--mist);
    }
    .auth-toggle button {
      background: none; border: none; color: var(--rail);
      font-weight: 600; cursor: pointer; font-size: 0.9rem;
      text-decoration: underline;
    }

    /* Publish page */
    .publish-page {
      padding: 90px 16px 60px;
      background: linear-gradient(160deg, var(--cloud) 0%, white 100%);
      min-height: 100vh;
    }
    .passenger-card {
      background: var(--cloud); border-radius: var(--radius-sm);
      padding: 16px; margin-top: 10px;
      border: 1px dashed rgba(13,15,26,0.15);
    }
    .passenger-label {
      font-size: 0.8rem; font-weight: 700; color: var(--mist);
      text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;
    }

    /* Profile page */
    .profile-page {
      padding: 90px clamp(16px,5vw,80px) 60px;
      min-height: 100vh;
    }
    .profile-card {
      background: var(--white); border-radius: var(--radius);
      box-shadow: var(--shadow-md); overflow: hidden;
      max-width: 700px; margin: 0 auto 40px;
    }
    .profile-header {
      background: linear-gradient(135deg, #0d0f1a, #1a1d30);
      padding: 36px 32px;
      display: flex; align-items: center; gap: 20px;
      color: white;
    }
    .profile-avatar-lg {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--rail), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem; font-weight: 700; color: white;
      border: 3px solid rgba(255,255,255,0.2);
    }
    .profile-body { padding: 28px 32px; }
    .profile-field {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 0; border-bottom: 1px solid var(--cloud);
    }
    .profile-field:last-child { border-bottom: none; }
    .field-label { font-size: 0.82rem; color: var(--mist); font-weight: 500; }
    .field-value { font-weight: 600; }

    /* Loader */
    .loader-wrap {
      display: flex; align-items: center; justify-content: center;
      padding: 80px 0;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid var(--cloud);
      border-top-color: var(--rail);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 80px 20px;
    }
    .empty-icon { font-size: 4rem; margin-bottom: 16px; opacity: 0.5; }
    .empty-title { font-size: 1.3rem; font-weight: 700; color: var(--ink-soft); margin-bottom: 8px; }
    .empty-sub { color: var(--mist); }

    /* Footer */
    footer {
      background: #0d0f1a; color: rgba(255,255,255,0.6);
      padding: clamp(40px,6vw,80px) clamp(16px,5vw,80px) 30px;
    }
    .footer-grid {
      display: grid; grid-template-columns: 2fr 1fr 1fr;
      gap: 40px; margin-bottom: 48px;
    }
    @media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; } }
    .footer-brand { color: white; font-size: 1.2rem; font-weight: 800; margin-bottom: 12px; }
    .footer-brand span { color: var(--rail); }
    .footer-desc { font-size: 0.88rem; line-height: 1.7; max-width: 300px; }
    .footer-heading { color: white; font-weight: 700; margin-bottom: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .footer-link { display: block; font-size: 0.88rem; margin-bottom: 8px; cursor: pointer; transition: color 0.2s; }
    .footer-link:hover { color: var(--rail); }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 24px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.82rem;
      flex-wrap: wrap; gap: 12px;
    }
    .footer-contact { display: flex; align-items: center; gap: 8px; }

    /* Modal / overlay */
    .modal-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(13,15,26,0.7); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .modal-box {
      background: white; border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 36px; max-width: 480px; width: 100%;
      animation: slideUp 0.25s ease;
      max-height: 90vh; overflow-y: auto;
    }
    @keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }

    /* Stats strip */
    .stats-strip {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 20px; margin-bottom: 40px;
    }
    .stat-card {
      background: white; border-radius: var(--radius); padding: 20px 24px;
      box-shadow: var(--shadow-sm); border: 1px solid var(--card-border);
    }
    .stat-num { font-size: 2rem; font-weight: 800; color: var(--rail); font-family: 'Syne', sans-serif; }
    .stat-label { font-size: 0.82rem; color: var(--mist); margin-top: 2px; }

    /* Toast notification */
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: #0d0f1a; color: white;
      padding: 14px 20px; border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg); font-size: 0.9rem; font-weight: 500;
      display: flex; align-items: center; gap: 10px;
      animation: toastIn 0.3s ease;
      border-left: 4px solid var(--rail);
      max-width: 340px;
    }
    @keyframes toastIn { from { transform: translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }

    /* Responsive helpers */
    @media (max-width: 768px) {
      .tickets-grid { grid-template-columns: 1fr; }
      .stats-strip { grid-template-columns: 1fr; }
      .navbar { padding: 0 16px; }
    }

    .tag { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 600; }
    .tag-rail { background: var(--rail-glow); color: var(--rail); }

    .divider { height: 1px; background: var(--cloud); margin: 20px 0; }

    /* Publish form max-width */
    .publish-form-wrap {
      max-width: 760px; margin: 0 auto;
      background: white; border-radius: 20px;
      box-shadow: var(--shadow-lg); padding: clamp(24px,4vw,48px);
    }

    /* section header */
    .section-header {
      margin-bottom: 40px;
    }
    .breadcrumb {
      font-size: 0.82rem; color: var(--mist); margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .breadcrumb span { color: var(--rail); }
  `}</style>
);

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className="toast">🔔 {message}</div>;
}

// ─── Navbar ───────────────────────────────────────────────────
function Navbar({ page, setPage }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setPage('home')}>
        <div className="logo-icon">🚆</div>
        Rail<span>Share</span>
      </div>
      <div className="nav-right">
        {user ? (
          <div className="profile-menu" onClick={e => e.stopPropagation()}>
            <div className="profile-trigger" onClick={() => setOpen(o => !o)}>
              <div className="profile-avatar">{user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}</div>
              {user.firstName} {user.lastName}
              <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>▼</span>
            </div>
            {open && (
              <div className="dropdown">
                <button className="dropdown-item" onClick={() => { setPage('profile'); setOpen(false); }}>
                  👤 View Profile
                </button>
                <button className="dropdown-item" onClick={() => { setPage('edit-profile'); setOpen(false); }}>
                  ✏️ Edit Profile
                </button>
                <button className="dropdown-item" onClick={() => { setPage('publish'); setOpen(false); }}>
                  🎫 Publish Ticket
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={() => { logout(); setOpen(false); setPage('home'); }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setPage('login')}>Login</button>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('register')}>Register</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Auth Page (Login + Register) ─────────────────────────────
function AuthPage({ setPage, toast, mode }) {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', mobile: '', password: '' });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (isLogin) {
        const { data } = await API.post('/auth/login', { email: form.email, password: form.password });
        login(data.token, data.user);
        toast('Welcome back, ' + data.user.firstName + '! 👋');
        setPage('home');
      } else {
        const { data } = await API.post('/auth/register', form);
        login(data.token, data.user);
        toast('Account created! Welcome aboard 🚆');
        setPage('home');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-wrapper">
        <div className="form-title">{isLogin ? 'Welcome Back' : 'Create Account'}</div>
        <div className="form-sub">{isLogin ? 'Login to view full ticket details & connect with sellers.' : 'Join thousands sharing railway tickets across India.'}</div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {!isLogin && (
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Arjun" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Sharma" />
            </div>
          </div>
        )}
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="arjun@email.com" />
        </div>
        {!isLogin && (
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="tel" value={form.mobile} onChange={set('mobile')} placeholder="9876543210" />
          </div>
        )}
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
          {loading ? '⏳ Please wait...' : isLogin ? '🚂 Login' : '✨ Create Account'}
        </button>
        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setPage(isLogin ? 'register' : 'login'); setError(''); }}>
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Publish Ticket Page ──────────────────────────────────────
function PublishPage({ setPage, toast }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    boardingStation: '', destinationStation: '', dateOfJourney: '',
    trainName: '', trainNumber: '', departureTime: '',
    classType: 'Sleeper', ticketStatus: 'Confirmed',
    racOrWaitingNumber: '', numberOfPassengers: 1, price: '',
  });
  const [passengers, setPassengers] = useState([{ gender: 'Male', age: '' }]);
  // Station autosuggest
const [boardingSuggestions, setBoardingSuggestions] = useState([]);
const [destinationSuggestions, setDestinationSuggestions] = useState([]);
const debounceTimer = useRef(null);

  const fetchStations = (value, type) => {

if (debounceTimer.current) clearTimeout(debounceTimer.current);

debounceTimer.current = setTimeout(async () => {

  if (!value) {
    type === "boarding"
      ? setBoardingSuggestions([])
      : setDestinationSuggestions([]);
    return;
  }

  try {

    const { data } = await API.get("/stations", {
      params: { query: value }
    });

    if (type === "boarding")
      setBoardingSuggestions(data);
    else
      setDestinationSuggestions(data);

  } catch (err) {
    console.error(err);
  }

}, 300);
};

const set = k => e => {

  const value = e.target.value;

  setForm(f => ({ ...f, [k]: value }));

  if (k === "boardingStation")
    fetchStations(value, "boarding");

  if (k === "destinationStation")
    fetchStations(value, "destination");

};

  const updatePassCount = e => {
    const n = parseInt(e.target.value);
    setForm(f => ({ ...f, numberOfPassengers: n }));
    setPassengers(Array.from({ length: n }, (_, i) => passengers[i] || { gender: 'Male', age: '' }));
  };

  const updatePassenger = (i, k, v) => {
    setPassengers(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  };

  const publish = async () => {
    setError(''); setLoading(true);
    try {
      await API.post('/tickets', { ...form, passengers, numberOfPassengers: Number(form.numberOfPassengers), price: Number(form.price) });
      toast('Ticket published successfully! 🎉');
      setPage('home');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to publish ticket');
    } finally {
      setLoading(false);
    }
  };

 if (!user) { setPage('login'); return null; }

  return (
    <div className="publish-page">
      <div className="publish-form-wrap">
        <div className="section-header">
          <div className="breadcrumb">Home <span>›</span> Publish Ticket</div>
          <h1 className="form-title">Publish Your Ticket</h1>
          <p className="form-sub">Share your extra railway ticket with people who need it.</p>
        </div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Journey Details */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rail)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            🚉 Journey Details
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Boarding Station *</label>
              <div style={{ position: "relative" }}>

<input
  value={form.boardingStation}
  onChange={set('boardingStation')}
  placeholder="e.g. New Delhi"
/>

{boardingSuggestions.length > 0 && (
  <div style={{
    position: "absolute",
    background: "white",
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: 8,
    maxHeight: 220,
    overflowY: "auto",
    zIndex: 1000
  }}>
    {boardingSuggestions.map(st => (
      <div
        key={st._id}
        style={{ padding: 10, cursor: "pointer" }}
        onClick={() => {
          setForm(f => ({
            ...f,
            boardingStation: `${st.code} - ${st.name}`
          }));
          setBoardingSuggestions([]);
        }}
      >
        <strong>{st.code}</strong> - {st.name}
      </div>
    ))}
  </div>
)}

</div>  
            </div>
            <div className="form-group">
              <label>Destination Station *</label>
              <div style={{ position: "relative" }}>

<input
  value={form.destinationStation}
  onChange={set('destinationStation')}
  placeholder="e.g. Mumbai CST"
/>

{destinationSuggestions.length > 0 && (
  <div style={{
    position: "absolute",
    background: "white",
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: 8,
    maxHeight: 220,
    overflowY: "auto",
    zIndex: 1000
  }}>
    {destinationSuggestions.map(st => (
      <div
        key={st._id}
        style={{ padding: 10, cursor: "pointer" }}
        onClick={() => {
          setForm(f => ({
            ...f,
            destinationStation: `${st.code} - ${st.name}`
          }));
          setDestinationSuggestions([]);
        }}
      >
        <strong>{st.code}</strong> - {st.name}
      </div>
    ))}
  </div>
)}

</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Journey *</label>
              <input type="date" value={form.dateOfJourney} onChange={set('dateOfJourney')} />
            </div>
            <div className="form-group">
              <label>Departure Time *</label>
              <input type="time" value={form.departureTime} onChange={set('departureTime')} />
            </div>
          </div>
        </div>

        {/* Train Details */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rail)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            🚂 Train Details
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Train Name *</label>
              <input value={form.trainName} onChange={set('trainName')} placeholder="e.g. Rajdhani Express" />
            </div>
            <div className="form-group">
              <label>Train Number *</label>
              <input value={form.trainNumber} onChange={set('trainNumber')} placeholder="e.g. 12301" />
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rail)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            🎫 Ticket Details
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Class of Ticket *</label>
              <select value={form.classType} onChange={set('classType')}>
                <option>Sleeper</option>
                <option>3rd AC</option>
                <option>2nd AC</option>
                <option>1st AC</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ticket Status *</label>
              <select value={form.ticketStatus} onChange={set('ticketStatus')}>
                <option>Confirmed</option>
                <option>RAC</option>
                <option>Waiting List</option>
              </select>
            </div>
          </div>

          {/* Conditional RAC / Waiting field */}
          {form.ticketStatus !== 'Confirmed' && (
            <div className="form-group" style={{ background: 'var(--cloud)', padding: 14, borderRadius: 10, border: '1px dashed rgba(232,51,74,0.3)' }}>
              <label>{form.ticketStatus === 'RAC' ? 'RAC Number' : 'Waiting List Number'} *</label>
              <input
                value={form.racOrWaitingNumber}
                onChange={set('racOrWaitingNumber')}
                placeholder={form.ticketStatus === 'RAC' ? 'e.g. RAC 45' : 'e.g. WL 12'}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Number of Passengers *</label>
              <select value={form.numberOfPassengers} onChange={updatePassCount}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Total Price (₹) *</label>
              <input type="number" value={form.price} onChange={set('price')} placeholder="e.g. 1500" min="0" />
            </div>
          </div>
        </div>

        {/* Passenger Details */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rail)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            👥 Passenger Details
          </div>
          {passengers.map((p, i) => (
            <div key={i} className="passenger-card">
              <div className="passenger-label">Passenger {i + 1}</div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Gender</label>
                  <select value={p.gender} onChange={e => updatePassenger(i, 'gender', e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Age</label>
                  <input type="number" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder="e.g. 28" min="0" max="120" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-full" onClick={publish} disabled={loading} style={{ padding: '14px', fontSize: '1rem' }}>
          {loading ? '⏳ Publishing...' : '🚀 Publish Ticket'}
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────
function TicketCard({ ticket, isLoggedIn, setPage }) {
  const [showContact, setShowContact] = useState(false);

  const statusChip = s => {
    if (s === 'Confirmed') return 'chip-status-confirmed';
    if (s === 'RAC') return 'chip-status-rac';
    return 'chip-status-waiting';
  };

  return (
    <div className="ticket-card">
      <div className="ticket-card-header">

  {/* Date ABOVE route */}
  <div className="ticket-date-badge">
    📅 {new Date(ticket.dateOfJourney).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    })}
  </div>
        <div className="ticket-route">
          <div>
            <div className="ticket-station-label">From</div>
            <div className="ticket-station">{ticket.boardingStation}</div>
          </div>
          <div className="route-arrow">
            <div className="route-line" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ticket-station-label">To</div>
            <div className="ticket-station">{ticket.destinationStation}</div>
          </div>
        </div>
        <div className="ticket-train-info">
          <span>🚂 {ticket.trainName}</span>
          <span>#{ticket.trainNumber}</span>
          {isLoggedIn && <span>⏰ {ticket.departureTime}</span>}
        </div>
      </div>

      <div className="ticket-card-body">
        {isLoggedIn ? (
          <>
            <div className="ticket-meta">
              <span className={`meta-chip chip-class`}>🎫 {ticket.classType}</span>
              <span className={`meta-chip ${statusChip(ticket.ticketStatus)}`}>
                {ticket.ticketStatus === 'Confirmed' ? '✅' : ticket.ticketStatus === 'RAC' ? '⚠️' : '⏳'} {ticket.ticketStatus}
              </span>
              <span className="meta-chip chip-passenger">👥 {ticket.numberOfPassengers} Pax</span>
            </div>
            {ticket.ticketStatus !== 'Confirmed' && ticket.racOrWaitingNumber && (
              <div style={{ fontSize: '0.82rem', color: 'var(--mist)', marginBottom: 12 }}>
                Number: <strong>{ticket.racOrWaitingNumber}</strong>
              </div>
            )}
            {ticket.passengers?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Passengers</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ticket.passengers.map((p, i) => (
                    <span key={i} className="meta-chip" style={{ background: 'var(--cloud)', color: 'var(--ink-soft)' }}>
                      {p.gender === 'Male' ? '👨' : p.gender === 'Female' ? '👩' : '🧑'} {p.age}y
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--mist)', marginBottom: 10 }}>Login to view full details</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Class', 'Status', 'Price', 'Passengers'].map(f => (
                <div key={f} className="blur-field">🔒 {f}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ticket-card-footer">
        {isLoggedIn ? (
          <div>
            <div className="ticket-price-label">Total Price</div>
            <div className="ticket-price">₹{ticket.price?.toLocaleString('en-IN')}</div>
          </div>
        ) : <div />}

        {isLoggedIn ? (
          <button className="btn btn-primary btn-sm" onClick={() => setShowContact(v => !v)}>
            {showContact ? '🙈 Hide Contact' : '🛒 Buy This Ticket'}
          </button>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => setPage('login')}>
            🔍 View More Details
          </button>
        )}
      </div>

      {showContact && isLoggedIn && ticket.userId && (
        <div style={{ padding: '0 22px 20px' }}>
          <div className="contact-reveal">
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1b5e20', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📞 Contact Seller
            </div>
            <div className="contact-item">
              📧 {ticket.userId.email}
            </div>
            <div className="contact-item">
              📱 {ticket.userId.mobile}
            </div>
            <div className="contact-item">
              👤 {ticket.userId.firstName} {ticket.userId.lastName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Home / Landing Page ──────────────────────────────────────
function HomePage({ setPage, toast }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ boarding: '', destination: '', date: '' });

  // ✅ Autocomplete states
  const [boardingSuggestions, setBoardingSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const debounceTimer = useRef(null);

  // ─── Fetch Tickets ─────────────────────────
  const fetchTickets = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await API.get('/tickets', { params });
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // ─── Fetch Station Suggestions ─────────────
  const fetchStationSuggestions = (value, type) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const timer = setTimeout(async () => {
      if (!value) {
        type === 'boarding'
          ? setBoardingSuggestions([])
          : setDestinationSuggestions([]);
        return;
      }

      try {
        const { data } = await API.get('/stations', {
          params: { query: value }
        });

        type === 'boarding'
          ? setBoardingSuggestions(data)
          : setDestinationSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    debounceTimer.current = timer;
  };

  const handleSearch = () => {
    const params = {};
    if (search.boarding) params.boarding = search.boarding;
    if (search.destination) params.destination = search.destination;
    if (search.date) params.date = search.date;
    fetchTickets(params);
  };

  const handleClear = () => {
    setSearch({ boarding: '', destination: '', date: '' });
    setBoardingSuggestions([]);
    setDestinationSuggestions([]);
    fetchTickets();
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="hero-grid" />
        <div className="hero-content">

          <div className="hero-badge">
            🇮🇳 India's Railway Ticket Sharing Community
          </div>

          <h1 className="hero-title">
            Share Extra Tickets,<br />
            <em>Help Fellow Travellers</em>
          </h1>

          <p className="hero-sub">
            Have an extra railway ticket? Publish it here. Need a ticket? Search and connect instantly.
          </p>

          {/* 🔍 Search Box */}
          <div className="search-box">
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              🔍 Find Tickets
            </div>

            <div className="search-grid">

              {/* Boarding */}
              <div style={{ position: 'relative' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                  Boarding Station
                </label>
                <input
                  value={search.boarding}
                  onChange={e => {
                    setSearch(s => ({ ...s, boarding: e.target.value }));
                    fetchStationSuggestions(e.target.value, 'boarding');
                  }}
                  placeholder="e.g. NDLS or New Delhi"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'white', marginTop: 6 }}
                />

                {boardingSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    background: 'white',
                    width: '100%',
                    maxHeight: 220,
                    overflowY: 'auto',
                    borderRadius: 10,
                    marginTop: 4,
                    zIndex: 1000
                  }}>
                    {boardingSuggestions.map(st => (
                      <div
                        key={st._id}
                        style={{ padding: 10, cursor: 'pointer' }}
                        onClick={() => {
                          setSearch(s => ({
                            ...s,
                            boarding: `${st.code} - ${st.name}`
                          }));
                          setBoardingSuggestions([]);
                        }}
                      >
                        <strong>{st.code}</strong> - {st.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div style={{ position: 'relative' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                  Destination
                </label>
                <input
                  value={search.destination}
                  onChange={e => {
                    setSearch(s => ({ ...s, destination: e.target.value }));
                    fetchStationSuggestions(e.target.value, 'destination');
                  }}
                  placeholder="e.g. BCT or Mumbai Central"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'white', marginTop: 6 }}
                />

                {destinationSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    background: 'white',
                    width: '100%',
                    maxHeight: 220,
                    overflowY: 'auto',
                    borderRadius: 10,
                    marginTop: 4,
                    zIndex: 1000
                  }}>
                    {destinationSuggestions.map(st => (
                      <div
                        key={st._id}
                        style={{ padding: 10, cursor: 'pointer' }}
                        onClick={() => {
                          setSearch(s => ({
                            ...s,
                            destination: `${st.code} - ${st.name}`
                          }));
                          setDestinationSuggestions([]);
                        }}
                      >
                        <strong>{st.code}</strong> - {st.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                  Date of Journey
                </label>
                <input
                  type="date"
                  value={search.date}
                  onChange={e => setSearch(s => ({ ...s, date: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'white', marginTop: 6 }}
                />
              </div>

              {/* Search Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSearch}>
                  🔍 Search Tickets
                </button>
              </div>

            </div>

            {(search.boarding || search.destination || search.date) && (
              <button
                onClick={handleClear}
                style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Tickets Section remains same */}
      <section className="section">
        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚂</div>
            <div className="empty-title">No Tickets Found</div>
          </div>
        ) : (
          <div className="tickets-grid">
            {tickets.map(t => (
              <TicketCard key={t._id} ticket={t} isLoggedIn={!!user} setPage={setPage} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────
function ProfilePage({ setPage, toast }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    API.get(`/tickets/user/${user.id}`).then(({ data }) => {
      setTickets(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user) { setPage('login'); return null; }

  const deleteTicket = async (id) => {
    if (!window.confirm('Delete this ticket?')) return;
    await API.delete(`/tickets/${id}`);
    setTickets(t => t.filter(x => x._id !== id));
    toast('Ticket deleted.');
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-lg">
  {user?.firstName?.[0] || ''}
  {user?.lastName?.[0] || ''}
</div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user?.firstName || ''} {user?.lastName || ''}</h2>
            <div style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: 4 }}>Railway Ticket Sharer</div>
          </div>
        </div>
        <div className="profile-body">
          <div className="profile-field">
            <span className="field-label">📧 Email</span>
            <span className="field-value">{user.email}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">📱 Mobile</span>
            <span className="field-value">{user.mobile}</span>
          </div>
          <div className="profile-field">
            <span className="field-label">🎫 Tickets Published</span>
            <span className="field-value">{tickets.length}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Published Tickets</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('publish')}>+ Publish New</button>
        </div>
        {loading ? <div className="loader-wrap"><div className="spinner" /></div> :
          tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <div className="empty-title">No Tickets Yet</div>
              <p className="empty-sub">Publish your first ticket to get started!</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage('publish')}>Publish Ticket</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tickets.map(t => (
                <div key={t._id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.boardingStation} → {t.destinationStation}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--mist)', marginTop: 4 }}>
                        {t.trainName} #{t.trainNumber} · {t.dateOfJourney} · {t.classType} · {t.ticketStatus}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--rail)', fontSize: '1.1rem' }}>₹{t.price?.toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--mist)', marginLeft: 8 }}>{t.numberOfPassengers} passenger{t.numberOfPassengers > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button className="btn btn-sm" style={{ color: '#c62828', border: '1px solid #ef9a9a', background: '#fce4ec', borderRadius: 8 }}
                      onClick={() => deleteTicket(t._id)}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ─── Edit Profile Page ────────────────────────────────────────
function EditProfilePage({ setPage, toast }) {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    mobile: user?.mobile || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = key => e =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    setError('');
    setLoading(true);

    try {
      const { data } = await API.put('/users/update', form);

      // ✅ VERY IMPORTANT FIX
      updateUser(data.user);

      toast('Profile updated successfully ✅');
      setPage('profile');

    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    setPage('login');
    return null;
  }

  return (
    <div className="auth-page">
      <div className="form-wrapper">

        <div className="breadcrumb" style={{ marginBottom: 8 }}>
          <button
            onClick={() => setPage('profile')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--mist)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              padding: 0
            }}
          >
            ← Back to Profile
          </button>
        </div>

        <div className="form-title">Edit Profile</div>
        <div className="form-sub">Update your personal information.</div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input
              value={form.firstName}
              onChange={set('firstName')}
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              value={form.lastName}
              onChange={set('lastName')}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Mobile Number</label>
          <input
            value={form.mobile}
            onChange={set('mobile')}
          />
        </div>

        <div className="form-group">
          <label>Email (cannot be changed)</label>
          <input
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={save}
          disabled={loading}
        >
          {loading ? '⏳ Saving...' : '✅ Save Changes'}
        </button>

      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────
function Footer({ setPage }) {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="footer-brand">Rail<span>Share</span> 🚆</div>
          <p className="footer-desc">
            India's community platform for sharing extra railway tickets. Helping travellers connect, save money, and travel smarter.
          </p>
          <div style={{ marginTop: 20, fontSize: '0.85rem' }}>
            <div>📧 support@railshare.in</div>
            <div style={{ marginTop: 6 }}>📱 +91 98765 43210</div>
          </div>
        </div>
        <div>
          <div className="footer-heading">Navigation</div>
          <div className="footer-link" onClick={() => setPage('home')}>Home</div>
          <div className="footer-link" onClick={() => setPage('login')}>Login / Register</div>
          <div className="footer-link" onClick={() => setPage('publish')}>Publish Ticket</div>
          <div className="footer-link" onClick={() => setPage('profile')}>My Profile</div>
        </div>
        <div>
          <div className="footer-heading">Developer</div>
          <div className="footer-link">📧 dev@railshare.in</div>
          <div className="footer-link">🐙 github.com/railshare</div>
          <div className="footer-link">💼 linkedin.com/railshare</div>
          <div style={{ marginTop: 20, fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.7 }}>
            Built with ❤️ using<br />
            MongoDB · Express · React · Node.js
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} RailShare. All rights reserved.</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
          Made for Indian Railways passengers 🇮🇳
        </div>
      </div>
    </footer>
  );
}

// ─── Auth Provider ────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rts_user')); } catch { return null; }
  });

  const login = (token, userData) => {
    localStorage.setItem('rts_token', token);
    localStorage.setItem('rts_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('rts_token');
    localStorage.removeItem('rts_user');
    setUser(null);
  };

  const updateUser = (data) => {
    const updated = { ...user, firstName: data.firstName, lastName: data.lastName, mobile: data.mobile };
    localStorage.setItem('rts_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home');
  const [toastMsg, setToastMsg] = useState('');

  const toast = (msg) => setToastMsg(msg);

  return (
    <AuthProvider>
      <GlobalStyles />
      <Navbar page={page} setPage={setPage} />
      <main>
        {page === 'home' && <HomePage setPage={setPage} toast={toast} />}
        {page === 'login' && <AuthPage mode="login" setPage={setPage} toast={toast} />}
        {page === 'register' && <AuthPage mode="register" setPage={setPage} toast={toast} />}
        {page === 'publish' && <PublishPage setPage={setPage} toast={toast} />}
        {page === 'profile' && <ProfilePage setPage={setPage} toast={toast} />}
        {page === 'edit-profile' && <EditProfilePage setPage={setPage} toast={toast} />}
      </main>
      <Footer setPage={setPage} />
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg('')} />}
    </AuthProvider>
  );
}