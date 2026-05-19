import React from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../tools.js';

export default function Home() {
  return (
    <div>
      <h2>AI Volunteer Matching Management</h2>
      <p className="muted">Match, schedule, retain, and recognize your volunteers.</p>
      <div className="tools-grid">
        {TOOLS.map((t) => (
          <Link key={t.path} to={t.path} className="tool-tile">
            <h3>{t.title}</h3>
            <p>{t.intro}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
