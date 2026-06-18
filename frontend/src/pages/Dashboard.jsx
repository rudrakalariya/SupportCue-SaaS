import React from 'react';
import AgentDashboard from '../components/AgentDashboard';
import CustomerDashboard from '../components/CustomerDashboard';
import SuperuserDashboard from '../components/SuperuserDashboard';

const Dashboard = ({ user, onLogout }) => {
  // Render different dashboard based on user role
  if (user.role === 'superuser') {
    return <SuperuserDashboard user={user} onLogout={onLogout} />;
  } else if (user.role === 'customer') {
    return <CustomerDashboard user={user} onLogout={onLogout} />;
  } else if (user.role === 'agent') {
    return <AgentDashboard user={user} onLogout={onLogout} />;
  } else {
    // Fallback for unknown roles
    return <AgentDashboard user={user} onLogout={onLogout} />;
  }
};

export default Dashboard;
