import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Homepage from "./pages/HomePage";
import RegisterAndLoginPage from "./pages/RegisterLogin_Page";
import AdminDashboard from "./pages/Admin/Admin_Dashboard";
import AdminEvents from "./pages/Admin/Admin_Events";
import BracketsPage from "./pages/Admin/Admin_Brackets";
import SchedulesPage from "./pages/Admin/Admin_Schedules";
import SideBar from "./components/sidebar";
import TeamsPage from "./pages/Admin/Admin_Teams";
import AdminStats from "./pages/Admin/AdminStats";
import AdminUsers from "./pages/Admin/Admin_Users";
import AdminAwardsStandings from "./pages/Admin/Admin_Awards & Standings";
import TournamentCreator from "./pages/Admin/TournamentCreator";

import SeasonalLeadersStats from "./pages/Admin/SeasonalLeadersStats"

import StaffDashboard from "./pages/Staff/Staff_Dashboard";
import StaffEvents from "./pages/Staff/Staff_Events";
import StaffStats from "./pages/Staff/Staff_Stats";

import ProtectedRoute from "./components/ProtectedRoute";
import EventDetails from "./pages/Admin/Admin_EventDetails";
import ResetPassword from "./components/ResetPassword";

import UserTeamsPage from "./pages/Users/User_TeamPage";
import UserStatsPage from "./pages/Users/User_StatsPage";
import User_BracketPage from "./pages/Users/User_BracketPage";
import UserSchedulePage from "./pages/Users/User_Schedule";
import UserAwardsStandings from "./pages/Users/User_Awards&Standings";

import "./style/app.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/Register&Login" element={<RegisterAndLoginPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/teams" element={<UserTeamsPage />} />
          <Route path="/stats" element={<UserStatsPage />} />
          <Route path="/brackets" element={<User_BracketPage />} />
          <Route path="/schedules" element={<UserSchedulePage />} />
          <Route path="/awards%standings" element={<UserAwardsStandings />} />

          {/* Admin protected routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route
              path="/AdminDashboard"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <AdminDashboard sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/events"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <AdminEvents sidebarOpen={sidebarOpen} />
                </>
              }
            />

            {/* Event details page */}
            <Route
              path="/AdminDashboard/events/:id"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <EventDetails sidebarOpen={sidebarOpen} />
                </>
              }
            />

            {/* Tournament Creator Route */}
            <Route
              path="/AdminDashboard/tournament-creator"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <TournamentCreator sidebarOpen={sidebarOpen} />
                </>
              }
            />

            {/* Brackets main page */}
            <Route
              path="/AdminDashboard/brackets"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <BracketsPage sidebarOpen={sidebarOpen} />
                </>
              }
            />

            {/* Bracket details page */}
            <Route
              path="/AdminDashboard/brackets/:id"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <BracketsPage sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/schedules"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <SchedulesPage sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/teams"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <TeamsPage sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/stats"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <SeasonalLeadersStats sidebarOpen={sidebarOpen} />
                </>
              }
            />

            {/* ✅ NEW: Admin Stats Viewer - Uses StaffStats component in view-only mode */}
            <Route
              path="/AdminDashboard/stats-viewer"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <StaffStats sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/awards&standings"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <AdminAwardsStandings sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/AdminDashboard/users"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <AdminUsers sidebarOpen={sidebarOpen} />
                </>
              }
            />
          </Route>

          {/* Sports Committee protected routes */}
          <Route element={<ProtectedRoute requiredRole="sports_committee" />}>
            <Route
              path="/StaffDashboard"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <StaffDashboard sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/StaffDashboard/events"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <StaffEvents sidebarOpen={sidebarOpen} />
                </>
              }
            />

            <Route
              path="/StaffDashboard/stats"
              element={
                <>
                  <SideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                  <StaffStats sidebarOpen={sidebarOpen} />
                </>
              }
            />
          </Route>

          {/* Add unauthorized route */}
          <Route path="/unauthorized" element={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>Unauthorized Access</h1>
              <p>You don't have permission to access this page.</p>
              <button onClick={() => window.history.back()}>Go Back</button>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;