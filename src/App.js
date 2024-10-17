// src/App.js

import React from 'react';
import './App.css';
import SmartMeterGraph from './components/SmartMeterGraph';
import UsageTable from './components/UsageTable'; // Import the UsageTable component

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Smart Alarm System</h1>
        <SmartMeterGraph />
        <div className="usage-table-section">
          <h2>Usage Data for Device</h2> {/* Add a heading above the UsageTable */}
          <UsageTable /> {/* Add the UsageTable component below the SmartMeterGraph */}
        </div>
      </header>
    </div>
  );
}

export default App;
