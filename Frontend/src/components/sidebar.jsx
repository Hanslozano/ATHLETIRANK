import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../style/sidebar.css";
import { useAuth } from "../context/AuthContext";
/*Icons*/
import { IoIosHome } from "react-icons/io";
import { TbTournament } from "react-icons/tb";
import { AiFillSchedule } from "react-icons/ai";
import { RiTeamFill } from "react-icons/ri";
import { IoStatsChart } from "react-icons/io5";
import { HiUsers } from "react-icons/hi2";
import { RiLogoutCircleLine } from "react-icons/ri";
import { FaUser } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { LiaAwardSolid } from "react-icons/lia";
import { FaTrophy } from "react-icons/fa";

const SideBar = ({ isOpen, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const handleNavClick = () => {
        // Close sidebar on mobile when any navigation link is clicked
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    };

    const adminMenuItems = [
        { icon: <IoIosHome />, label: "Dashboard", id: "dashboard", path: "/AdminDashboard" },
        { icon: <TbTournament />, label: "Tournament Creator", id: "tournament-creator", path: "/AdminDashboard/tournament-creator" },
        { icon: <AiFillSchedule />, label: "Events", id: "events", path: "/AdminDashboard/events" },
        { icon: <RiTeamFill />, label: "Teams", id: "teams", path: "/AdminDashboard/teams" },
        { icon: <FaTrophy />, label: "Seasonal Leaders", id: "stats", path: "/AdminDashboard/stats" },
        { icon: <HiUsers />, label: "Users", id: "users", path: "/AdminDashboard/users" },
    ];
    
    const sportsCommitteeMenuItems = [
        { icon: <IoIosHome />, label: "Dashboard", id: "dashboard", path: "/StaffDashboard" },
        { icon: <IoStatsChart />, label: "Events", id: "events", path: "/StaffDashboard/events" },
    ];

    // Format role for display
    const formatRole = (role) => {
        return role === 'sports_committee' ? 'Sports Committee' : 
               role === 'admin' ? 'Admin' : role;
    };

    const menuItems = user?.role === 'admin' ? adminMenuItems : sportsCommitteeMenuItems;

    // Ultra-fast animation variants
    const sidebarVariants = {
        open: {
            width: 280,
            transition: {
                type: "tween",
                duration: 0.08,
                ease: "easeOut"
            }
        },
        closed: {
            width: 70,
            transition: {
                type: "tween",
                duration: 0.08,
                ease: "easeOut"
            }
        }
    };

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { duration: 0.08 }
        },
        exit: { 
            opacity: 0,
            transition: { duration: 0.05 }
        }
    };

    const menuItemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: (custom) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: custom * 0.01,
                duration: 0.08,
                ease: "easeOut"
            }
        })
    };

    const labelVariants = {
        open: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.05
            }
        },
        closed: {
            opacity: 0,
            x: -5,
            transition: {
                duration: 0.05
            }
        }
    };

    const iconVariants = {
        hover: {
            scale: 1.1,
            transition: {
                duration: 0.1
            }
        },
        tap: {
            scale: 0.95
        }
    };

    return (
        <div className="sidebar-container">
            {/* Toggle Button - Aligned with user profile */}
            <motion.button 
                className="sidebar-toggle" 
                onClick={toggleSidebar} 
                aria-label="Toggle sidebar"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                    duration: 0.08
                }}
            >
                <GiHamburgerMenu />
            </motion.button>

            {/* Sidebar */}
            <motion.div 
                className={`sidebar-content ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
                variants={sidebarVariants}
                initial={false}
                animate={isOpen ? "open" : "closed"}
            >
                
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-user-profile">
                        {/* User avatar aligned with burger icon */}
                        <motion.div 
                            className="sidebar-user-avatar"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.1 }}
                        >
                            <FaUser />
                        </motion.div>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div 
                                    className="sidebar-user-info"
                                    variants={labelVariants}
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                >
                                    <div className="sidebar-user-name">
                                        {user?.username}
                                    </div>
                                    <div className="sidebar-user-role">
                                        {formatRole(user?.role)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <ul className="sidebar-nav-list">
                        {menuItems.map((item, index) => (
                            <motion.li 
                                key={item.id} 
                                className="sidebar-nav-item"
                                custom={index}
                                variants={menuItemVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <Link 
                                    to={item.path} 
                                    className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={handleNavClick}
                                >
                                    <motion.span 
                                        className="sidebar-nav-icon"
                                        variants={iconVariants}
                                        whileHover="hover"
                                        whileTap="tap"
                                    >
                                        {item.icon}
                                    </motion.span>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.span 
                                                className="sidebar-nav-label"
                                                variants={labelVariants}
                                                initial="closed"
                                                animate="open"
                                                exit="closed"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            </motion.li>
                        ))}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <motion.button 
                        onClick={() => {
                            handleLogout();
                            handleNavClick();
                        }} 
                        className="sidebar-nav-link logout-link"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <motion.span 
                            className="sidebar-nav-icon"
                            whileHover={{ 
                                rotate: -10,
                                scale: 1.05,
                                transition: { duration: 0.1 }
                            }}
                        >
                            <RiLogoutCircleLine />
                        </motion.span>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.span 
                                    className="sidebar-nav-label"
                                    variants={labelVariants}
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                >
                                    Log Out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </motion.div>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        className="sidebar-overlay" 
                        onClick={toggleSidebar}
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SideBar;