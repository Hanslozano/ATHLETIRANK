import "../../style/Admin_Dashboard.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaUsers, FaCalendarAlt, FaChartBar, FaBasketballBall, FaVolleyballBall, FaArrowRight, FaClock, FaFire } from "react-icons/fa";

const AdminDashboard = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    events: [],
    teams: [],
    brackets: [],
    recentMatches: [],
    loading: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eventsRes, teamsRes, bracketsRes] = await Promise.all([
          fetch("http://localhost:5000/api/events"),
          fetch("http://localhost:5000/api/teams"),
          fetch("http://localhost:5000/api/brackets")
        ]);

        const events = await eventsRes.json();
        const teams = await teamsRes.json();
        const brackets = await bracketsRes.json();

        // Fetch recent matches from all brackets with more details
        const recentMatchesPromises = brackets.slice(0, 3).map(bracket =>
          fetch(`http://localhost:5000/api/brackets/${bracket.id}/matches`)
            .then(res => res.json())
            .then(matches => matches.map(m => ({ 
              ...m, 
              bracket_name: bracket.name, 
              sport_type: bracket.sport_type,
              bracket_id: bracket.id,
              event_id: bracket.event_id
            })))
        );

        const matchesArrays = await Promise.all(recentMatchesPromises);
        const allMatches = matchesArrays.flat();
        const recentMatches = allMatches
          .filter(m => m.status === "completed")
          .sort((a, b) => new Date(b.updated_at || b.scheduled_at) - new Date(a.updated_at || a.scheduled_at))
          .slice(0, 5);

        setDashboardData({
          events,
          teams,
          brackets,
          recentMatches,
          loading: false
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  const { events, teams, brackets, recentMatches, loading } = dashboardData;

  // Handle match click - navigate to stats with match data
  const handleMatchClick = (match) => {
    // Find the event and bracket for this match
    const bracket = brackets.find(b => b.id === match.bracket_id);
    const event = events.find(e => e.id === match.event_id);
    
    // Store match data and context in session storage
    const matchData = {
      matchId: match.id,
      match: match,
      eventId: match.event_id,
      bracketId: match.bracket_id
    };
    
    const contextData = {
      selectedEvent: event,
      selectedBracket: bracket
    };
    
    sessionStorage.setItem('selectedMatchData', JSON.stringify(matchData));
    sessionStorage.setItem('adminEventsContext', JSON.stringify(contextData));
    
    // Navigate to stats page
    navigate("/AdminDashboard/stats");
  };

  // NEW FUNCTION: Handle sport category click in Teams Overview
  const handleSportCategoryClick = (sport) => {
    // Store the selected sport filter in session storage
    sessionStorage.setItem('teamSportFilter', sport);
    // Navigate to teams management page
    navigate("/AdminDashboard/teams");
  };

  // Calculate statistics (your existing code remains the same)
  const ongoingEvents = events.filter(e => e.status === "ongoing").length;
  const completedEvents = events.filter(e => e.status === "completed").length;
  const basketballTeams = teams.filter(t => t.sport?.toLowerCase() === "basketball").length;
  const volleyballTeams = teams.filter(t => t.sport?.toLowerCase() === "volleyball").length;
  const totalPlayers = teams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
  const activeBrackets = brackets.filter(b => {
    const event = events.find(e => e.id === b.event_id);
    return event?.status === "ongoing";
  }).length;

  const statsCards = [
    {
      title: "Total Events",
      value: events.length,
      subtitle: `${ongoingEvents} ongoing, ${completedEvents} completed`,
      icon: <FaCalendarAlt />,
      color: "var(--primary-color)",
      link: "/AdminDashboard/events"
    },
    {
      title: "Total Teams",
      value: teams.length,
      subtitle: `${basketballTeams} basketball, ${volleyballTeams} volleyball`,
      icon: <FaUsers />,
      color: "#34a853",
      link: "/AdminDashboard/teams"
    },
    {
      title: "Total Brackets",
      value: brackets.length,
      subtitle: `${activeBrackets} active tournaments`,
      icon: <FaTrophy />,
      color: "#fbbc04",
      link: "/AdminDashboard/brackets"
    },
    {
      title: "Total Players",
      value: totalPlayers,
      subtitle: `Across ${teams.length} teams`,
      icon: <FaChartBar />,
      color: "#ea4335",
      link: "/AdminDashboard/teams"
    }
  ];

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Admin Dashboard</h1>
              <p>Welcome to your sports management system</p>
            </div>
            <div className="header-decoration">
              <div className="decoration-circle"></div>
              <div className="decoration-circle"></div>
              <div className="decoration-circle"></div>
            </div>
          </div>
        </div>

        <div className="dashboard-main">
          {loading ? (
            <div className="dashboard-loading">
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="stats-grid">
                {statsCards.map((card, index) => (
                  <div
                    key={index}
                    className="stat-card"
                    onClick={() => navigate(card.link)}
                    style={{ borderTop: `3px solid ${card.color}` }}
                  >
                    <div className="stat-icon" style={{ color: card.color }}>
                      {card.icon}
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{card.value}</div>
                      <div className="stat-title">{card.title}</div>
                      <div className="stat-subtitle">{card.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="dashboard-grid">
                {/* Recent Events */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Recent Events</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/events")}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {events.length === 0 ? (
                      <div className="empty-state">
                        <p>No events created yet</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/AdminDashboard/events")}
                        >
                          Create First Event
                        </button>
                      </div>
                    ) : (
                      <div className="events-list">
                        {events.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className="event-item"
                            onClick={() => navigate(`/AdminDashboard/events/${event.id}`)}
                          >
                            <div className="event-info">
                              <div className="event-name">{event.name}</div>
                              <div className="event-dates">
                                <FaClock /> {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`event-status status-${event.status}`}>
                              {event.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Matches - UPDATED */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Recent Matches</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/stats")}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {recentMatches.length === 0 ? (
                      <div className="empty-state">
                        <p>No completed matches yet</p>
                      </div>
                    ) : (
                      <div className="matches-list">
                        {recentMatches.map(match => (
                          <div 
                            key={match.id} 
                            className="match-item clickable-match"
                            onClick={() => handleMatchClick(match)}
                          >
                            <div className="match-sport-icon">
                              {match.sport_type?.toLowerCase() === "basketball" ? (
                                <FaBasketballBall style={{ color: "#ff6b35" }} />
                              ) : (
                                <FaVolleyballBall style={{ color: "#4ecdc4" }} />
                              )}
                            </div>
                            <div className="match-details">
                              <div className="match-teams">
                                {match.team1_name} vs {match.team2_name}
                              </div>
                              <div className="match-bracket">{match.bracket_name}</div>
                              <div className="match-score-small">
                                {match.score_team1} - {match.score_team2}
                              </div>
                            </div>
                            <div className="match-arrow">
                              <FaArrowRight />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teams & Brackets Overview */}
              <div className="dashboard-grid">
                {/* Teams by Sport - UPDATED */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Teams Overview</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/teams")}
                    >
                      Manage Teams <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {teams.length === 0 ? (
                      <div className="empty-state">
                        <p>No teams created yet</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/AdminDashboard/teams")}
                        >
                          Create First Team
                        </button>
                      </div>
                    ) : (
                      <div className="teams-overview">
                        {/* Basketball Category - Now Clickable */}
                        <div 
                          className="sport-category clickable-sport"
                          onClick={() => handleSportCategoryClick("Basketball")}
                        >
                          <div className="category-header">
                            <FaBasketballBall style={{ color: "#ff6b35" }} />
                            <span>Basketball</span>
                          </div>
                          <div className="category-stats">
                            <div className="stat">{basketballTeams} teams</div>
                            <div className="stat">
                              {teams.filter(t => t.sport?.toLowerCase() === "basketball")
                                .reduce((sum, t) => sum + (t.players?.length || 0), 0)} players
                            </div>
                          </div>
                        </div>
                        
                        {/* Volleyball Category - Now Clickable */}
                        <div 
                          className="sport-category clickable-sport"
                          onClick={() => handleSportCategoryClick("Volleyball")}
                        >
                          <div className="category-header">
                            <FaVolleyballBall style={{ color: "#4ecdc4" }} />
                            <span>Volleyball</span>
                          </div>
                          <div className="category-stats">
                            <div className="stat">{volleyballTeams} teams</div>
                            <div className="stat">
                              {teams.filter(t => t.sport?.toLowerCase() === "volleyball")
                                .reduce((sum, t) => sum + (t.players?.length || 0), 0)} players
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Brackets */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Active Brackets</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/brackets")}
                    >
                      Manage Brackets <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {brackets.length === 0 ? (
                      <div className="empty-state">
                        <p>No brackets created yet</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/AdminDashboard/brackets")}
                        >
                          Create First Bracket
                        </button>
                      </div>
                    ) : (
                      <div className="brackets-list">
                        {brackets.slice(0, 4).map(bracket => {
                          const event = events.find(e => e.id === bracket.event_id);
                          return (
                            <div key={bracket.id} className="bracket-item">
                              <div className="bracket-info">
                                <div className="bracket-name">{bracket.name}</div>
                                <div className="bracket-meta">
                                  {capitalize(bracket.sport_type)} • {bracket.elimination_type === "single" ? "Single" : "Double"} Elimination
                                </div>
                              </div>
                              {event?.status === "ongoing" && (
                                <div className="active-badge">
                                  <FaFire /> Active
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/events")}
                  >
                    <FaCalendarAlt />
                    <span>Create Event</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/teams")}
                  >
                    <FaUsers />
                    <span>Add Team</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/brackets")}
                  >
                    <FaTrophy />
                    <span>Generate Bracket</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/stats")}
                  >
                    <FaChartBar />
                    <span>View Statistics</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;