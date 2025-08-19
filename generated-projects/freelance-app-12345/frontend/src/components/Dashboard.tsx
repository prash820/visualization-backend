import React from 'react';

interface DashboardProps {
  // Add props as needed
}

export const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <div className="dashboard">
      <h2>Freelancer Dashboard</h2>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Earnings</h3>
          <p>$2,450</p>
        </div>
        <div className="stat-card">
          <h3>Active Projects</h3>
          <p>3</p>
        </div>
        <div className="stat-card">
          <h3>Completed Projects</h3>
          <p>12</p>
        </div>
        <div className="stat-card">
          <h3>Client Rating</h3>
          <p>4.8/5</p>
        </div>
      </div>
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <ul>
          <li>Project "Website Redesign" completed</li>
          <li>New message from Client A</li>
          <li>Payment received for Logo Design</li>
        </ul>
      </div>
    </div>
  );
};
