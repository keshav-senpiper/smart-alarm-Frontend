// UsageTable.js
import React, { useState } from 'react';
import axios from 'axios';
import './UsageTable.css';

const UsageTable = () => {
  const [deviceID, setDeviceID] = useState('');
  const [usageData, setUsageData] = useState([]);
  const [error, setError] = useState('');

  const fetchUsageData = async () => {
    if (!deviceID) {
      setError('Device ID is required.');
      return;
    }
    try {
      // Use POST request to call the API with device_id in the request body
      const response = await axios.post('http://localhost:3010/api/all-power-source-usage', {
        device_id: deviceID,
      });

      const data = response.data;

      if (!data || data.length === 0) {
        setError('No usage data found for the given device ID.');
        setUsageData([]);
        return;
      }

      setUsageData(data);
      setError('');
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError('Failed to fetch data. Please try again.');
    }
  };

  return (
    <div className="usage-table-container">
      <h3>Power Source Usage Data</h3>
      <input 
        type="text"
        value={deviceID}
        onChange={(e) => setDeviceID(e.target.value)}
        placeholder="Enter Device ID"
      />
      <button onClick={fetchUsageData}>Fetch Usage Data</button>

      {error && <p className="error-message">{error}</p>}

      {usageData.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Device ID</th>
              <th>Power Source</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Usage Time (Seconds)</th>
            </tr>
          </thead>
          <tbody>
            {usageData.map((usage, index) => (
              <tr key={index}>
                <td>{usage.id}</td>
                <td>{usage.device_id}</td>
                <td>{usage.power_source}</td>
                <td>{new Date(usage.start_time).toLocaleString()}</td>
                <td>{usage.end_time ? new Date(usage.end_time).toLocaleString() : 'Ongoing'}</td>
                <td>
                  {typeof usage.usage_time === 'number'
                    ? usage.usage_time.toFixed(2)
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsageTable;
