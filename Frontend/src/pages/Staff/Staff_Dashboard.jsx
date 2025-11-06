import "../../style/Admin_Dashboard.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCalendarAlt, FaChartBar, FaBasketballBall, FaVolleyballBall, FaArrowRight, FaClock, FaFire, FaClipboardList } from "react-icons/fa";

const StaffDashboard = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    events: [],
    brackets: [],
    schedules: [],
    recentMatches: [],
    loading: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eventsRes, bracketsRes, schedulesRes] = await Promise.all([
          fetch("http://localhost:5000/api/events"),
          fetch("http://localhost:5000/api/brackets"),
          fetch("http://localhost:5000/api/schedules")
        ]);

        const events = await eventsRes.json();
        const brackets = await bracketsRes.json();
        const schedules = await schedulesRes.json();

        // Fetch recent completed matches from all brackets
        const recentMatchesPromises = brackets.slice(0, 3).map(bracket =>
          fetch(`http://localhost:5000/api/brackets/${bracket.id}/matches`)
            .then(res => res.json())
            .then(matches => matches.map(m => ({ ...m, bracket_name: bracket.name, sport_type: bracket.sport_type })))
        );

        const matchesArrays = await Promise.all(recentMatchesPromises);
        const allMatches = matchesArrays.flat();
        const recentMatches = allMatches
          .filter(m => m.status === "completed")
          .sort((a, b) => new Date(b.updated_at || b.scheduled_at) - new Date(a.updated_at || a.scheduled_at))
          .slice(0, 5);

        setDashboardData({
          events,
          brackets,
          schedules,
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

  const { events, brackets, schedules, recentMatches, loading } = dashboardData;

  // Calculate statistics
  const ongoingEvents = events.filter(e => e.status === "ongoing").length;
  const upcomingSchedules = schedules.filter(s => {
    const scheduleDate = new Date(s.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scheduleDate >= today;
  }).length;
  const completedMatches = recentMatches.length;
  const activeBrackets = brackets.filter(b => {
    const event = events.find(e => e.id === b.event_id);
    return event?.status === "ongoing";
  }).length;

  const statsCards = [
    {
      title: "Active Events",
      value: ongoingEvents,
      subtitle: `${events.length} total events`,
      icon: <FaCalendarAlt />,
      color: "var(--primary-color)",
      link: "/StaffDashboard/events"
    },
    {
      title: "Upcoming Schedules",
      value: upcomingSchedules,
      subtitle: `${schedules.length} total schedules`,
      icon: <FaClipboardList />,
      color: "#34a853",
      link: "/StaffDashboard/schedule"
    },
    {
      title: "Active Brackets",
      value: activeBrackets,
      subtitle: `${brackets.length} total brackets`,
      icon: <FaTrophy />,
      color: "#fbbc04",
      link: "/StaffDashboard/events"
    },
    {
      title: "Completed Matches",
      value: completedMatches,
      subtitle: `Recent statistics recorded`,
      icon: <FaChartBar />,
      color: "#ea4335",
      link: "/StaffDashboard/stats"
    }
  ];

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Format round display
  const formatRoundDisplay = (match) => {
    if (!match || !match.round_number) return "Unknown Round";
    
    const roundNum = match.round_number;
    const bracketType = match.bracket_type;
    
    if (roundNum === 200) return 'Grand Final';
    if (roundNum === 201) return 'Reset Final';
    if (roundNum >= 200 && bracketType === 'championship') {
      return `Championship Round ${roundNum - 199}`;
    }
    
    if (bracketType === 'loser' || (roundNum >= 101 && roundNum < 200)) {
      return `LB Round ${roundNum - 100}`;
    }
    
    if (bracketType === 'winner' || roundNum < 100) {
      return `Round ${roundNum}`;
    }
    
    return `Round ${roundNum}`;
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Staff Dashboard</h1>
              <p>Welcome to your staff management panel</p>
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
                {/* Active Events */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Active Events</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/StaffDashboard/events")}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {events.filter(e => e.status === "ongoing").length === 0 ? (
                      <div className="empty-state">
                        <p>No active events at the moment</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/StaffDashboard/events")}
                        >
                          View All Events
                        </button>
                      </div>
                    ) : (
                      <div className="events-list">
                        {events.filter(e => e.status === "ongoing").slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className="event-item"
                            onClick={() => {
                              // Navigate to events page and set context to show this event's brackets
                              sessionStorage.setItem('staffEventsContext', JSON.stringify({
                                selectedEvent: event,
                                selectedBracket: null,
                                activeTab: 'events'
                              }));
                              navigate("/StaffDashboard/events");
                            }}
                          >
                            <div className="event-info">
                              <div className="event-name">{event.name}</div>
                              <div className="event-dates">
                                <FaClock /> {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`event-status status-${event.status}`}>
                              <FaFire /> {event.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Matches */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Recent Match Results</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/StaffDashboard/stats")}
                    >
                      Record Stats <FaArrowRight />
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
                          <div key={match.id} className="match-item">
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
                              <div className="match-bracket">
                                {match.bracket_name} - {formatRoundDisplay(match)}
                              </div>
                            </div>
                            <div className="match-score">
                              {match.score_team1} - {match.score_team2}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Schedules & Brackets Overview */}
              <div className="dashboard-grid">
                {/* Upcoming Schedules */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Upcoming Schedules</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/StaffDashboard/schedule")}
                    >
                      View Schedule <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {schedules.filter(s => {
                      const scheduleDate = new Date(s.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return scheduleDate >= today;
                    }).length === 0 ? (
                      <div className="empty-state">
                        <p>No upcoming schedules</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/StaffDashboard/schedule")}
                        >
                          View All Schedules
                        </button>
                      </div>
                    ) : (
                      <div className="brackets-list">
                        {schedules
                          .filter(s => {
                            const scheduleDate = new Date(s.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return scheduleDate >= today;
                          })
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .slice(0, 4)
                          .map(schedule => (
                            <div key={schedule.id} className="bracket-item">
                              <div className="bracket-info">
                                <div className="bracket-name">
                                  {schedule.team1_name && schedule.team2_name 
                                    ? `${schedule.team1_name} vs ${schedule.team2_name}`
                                    : schedule.bracket_name || "Match"}
                                </div>
                                <div className="bracket-meta">
                                  {new Date(schedule.date).toLocaleDateString()} • {schedule.venue}
                                </div>
                              </div>
                              <div className="active-badge">
                                <FaClock /> Upcoming
                              </div>
                            </div>
                          ))}
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
                      onClick={() => navigate("/StaffDashboard/events")}
                    >
                      View Brackets <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {brackets.filter(b => {
                      const event = events.find(e => e.id === b.event_id);
                      return event?.status === "ongoing";
                    }).length === 0 ? (
                      <div className="empty-state">
                        <p>No active brackets</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/StaffDashboard/events")}
                        >
                          View All Brackets
                        </button>
                      </div>
                    ) : (
                      <div className="brackets-list">
                        {brackets
                          .filter(b => {
                            const event = events.find(e => e.id === b.event_id);
                            return event?.status === "ongoing";
                          })
                          .slice(0, 4)
                          .map(bracket => {
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
                    onClick={() => navigate("/StaffDashboard/events")}
                  >
                    <FaCalendarAlt />
                    <span>View Events</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/StaffDashboard/schedule")}
                  >
                    <FaClipboardList />
                    <span>View Schedules</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/StaffDashboard/stats")}
                  >
                    <FaChartBar />
                    <span>Record Statistics</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/StaffDashboard/events")}
                  >
                    <FaTrophy />
                    <span>View Brackets</span>
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

export default StaffDashboard;