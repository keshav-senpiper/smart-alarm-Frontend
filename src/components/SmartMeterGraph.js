import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register required Chart.js components
ChartJS.register(zoomPlugin,CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

const SmartMeterGraph = () => {
  const [deviceID, setDeviceID] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedParams, setSelectedParams] = useState([]);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [chartData, setChartData] = useState({});
  const chartRef = useRef(null);

  const parameterOptions = [
    { value: 'voltage', label: 'Voltage (V)' },
    { value: 'current', label: 'Current (A)' },
    { value: 'kw', label: 'Power (kW)' },
    { value: 'pf', label: 'Power Factor (PF)' },  // Added PF option
  ];

  const phaseOptions = [
    { value: 'phase1', label: 'Phase 1' },
    { value: 'phase2', label: 'Phase 2' },
    { value: 'phase3', label: 'Phase 3' },
    { value: 'others', label: 'Others' },
  ];

   // Function to fill missing data points
   const fillMissingDataPoints = (data) => {
    const filledData = [];
    const timeGapThreshold = 60 * 1000; // 60 seconds in milliseconds
    for (let i = 0; i < data.length - 1; i++) {
      const currentReading = data[i];
      const nextReading = data[i + 1];
      filledData.push(currentReading); // Always add current reading

      const currentTimestamp = new Date(currentReading.timestamp).getTime();
      const nextTimestamp = new Date(nextReading.timestamp).getTime();
      const timeDifference = nextTimestamp - currentTimestamp;

      if (timeDifference > timeGapThreshold) {
        // Calculate how many missing intervals
        const missingIntervals = Math.floor(timeDifference / timeGapThreshold);

        for (let j = 1; j <= missingIntervals; j++) {
          const interpolatedTimestamp = new Date(currentTimestamp + j * timeGapThreshold);
          filledData.push({
            timestamp: interpolatedTimestamp.toISOString(),
            phase1_kw: 0,
            phase1_current: 0,
            phase1_voltage: 0,
            phase1_pf: 0,
            phase2_kw: 0,
            phase2_current: 0,
            phase2_voltage: 0,
            phase2_pf: 0,
            phase3_kw: 0,
            phase3_current: 0,
            phase3_voltage: 0,
            phase3_pf: 0,
            others_f: 0,
            others_apf: 0,
            others_tkw: 0,
            avg_current: 0,
            avg_voltage: 0,
          });
        }
      }
    }
    filledData.push(data[data.length - 1]); // Add the last reading
    return filledData;
  };

  const fetchReadings = async () => {
    try {
      // Ensure deviceID and date range are selected
      if (!deviceID || !startDate || !endDate) {
        alert('Device ID and date range are required.');
        return;
      }
  
      // Construct the request payload based on user selection
      const payload = {
        device_id: deviceID,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        phase: selectedPhases.length > 0 ? selectedPhases.map((phase) => phase.value) : [],
        param: selectedParams.length > 0 ? selectedParams.map((param) => param.value) : [],
      };
  
      const response = await axios.post('http://13.201.120.140:3010/api/smart-meter/readings', payload);
      
      let data = response.data;
      data = fillMissingDataPoints(data);

      // Prepare chart data based on the response
      const labels = data.map((reading) => new Date(reading.timestamp).toLocaleString());
      const datasets = [];
  
      if (selectedPhases.length === 0 && selectedParams.length === 0) {
        // No specific phases or parameters selected, use avg_current and avg_voltage
        datasets.push({
          label: 'Average Current (A)',
          data: data.map((reading) => reading.avg_current),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y-current',
        });
        datasets.push({
          label: 'Average Voltage (V)',
          data: data.map((reading) => reading.avg_voltage),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          yAxisID: 'y-voltage',
        });
      } else if (selectedParams.length > 0 && selectedPhases.length === 0) {
        // Parameters are selected but no phases are selected, show all three phases for each parameter
        selectedParams.forEach((param, paramIndex) => {
          ['phase1', 'phase2', 'phase3'].forEach((phase, phaseIndex) => {
            const key = `${phase}_${param.value}`;
            if (data.some((reading) => reading[key] !== undefined)) {
              const paramData = data.map((reading) => reading[key] !== undefined ? reading[key] : 0);
              datasets.push({
                label: `${phase.toUpperCase()} ${param.label}`,
                data: paramData,
                borderColor: `rgba(${(phaseIndex + 1) * 60}, ${(paramIndex + 1) * 60}, 132, 1)`,
                backgroundColor: `rgba(${(phaseIndex + 1) * 60}, ${(paramIndex + 1) * 60}, 132, 0.2)`,
                yAxisID: param.value === 'kw' ? 'y-power' : param.value === 'voltage' ? 'y-voltage' : 'y-current',
              });
            }
          });
        });
      } else if (selectedParams.length === 0 && selectedPhases.includes('others')) {
        // When "others" phase is selected and no params are selected, show "others" data
        const othersKeys = ['others_f', 'others_apf', 'others_tkw'];
        othersKeys.forEach((key, keyIndex) => {
          if (data.some((reading) => reading[key] !== undefined)) {
            const paramData = data.map((reading) => reading[key] !== undefined ? reading[key] : 0);
            datasets.push({
              label: `Others ${key.replace('others_', '').toUpperCase()}`,
              data: paramData,
              borderColor: `rgba(${(keyIndex + 1) * 60}, 120, 132, 1)`,
              backgroundColor: `rgba(${(keyIndex + 1) * 60}, 120, 132, 0.2)`,
              yAxisID: key === 'others_tkw' ? 'y-power' : 'y-current',
            });
          }
        });
      } else {
        // Handle selected phases and parameters
        selectedPhases.forEach((phase, phaseIndex) => {
          if (phase.value === 'others') {
            // Handle "others" phase with its specific fields
            const othersKeys = ['others_f', 'others_apf', 'others_tkw'];
            othersKeys.forEach((key, keyIndex) => {
              if (data.some((reading) => reading[key] !== undefined)) {
                const paramData = data.map((reading) => reading[key] !== undefined ? reading[key] : 0);
                datasets.push({
                  label: `Others ${key.replace('others_', '').toUpperCase()}`,
                  data: paramData,
                  borderColor: `rgba(${(keyIndex + 1) * 60}, 120, ${(phaseIndex + 1) * 60}, 1)`,
                  backgroundColor: `rgba(${(keyIndex + 1) * 60}, 120, ${(phaseIndex + 1) * 60}, 0.2)`,
                  yAxisID: key === 'others_tkw' ? 'y-power' : 'y-current',
                });
              }
            });
          } else {
            selectedParams.forEach((param, paramIndex) => {
              const key = `${phase.value}_${param.value}`;
              if (data.some((reading) => reading[key] !== undefined)) {
                const paramData = data.map((reading) => reading[key] !== undefined ? reading[key] : 0);
                datasets.push({
                  label: `${phase.label} ${param.label}`,
                  data: paramData,
                  borderColor: `rgba(${(phaseIndex + 1) * 60}, ${(paramIndex + 1) * 60}, 132, 1)`,
                  backgroundColor: `rgba(${(phaseIndex + 1) * 60}, ${(paramIndex + 1) * 60}, 132, 0.2)`,
                  yAxisID: param.value === 'kw' ? 'y-power' : param.value === 'voltage' ? 'y-voltage' : 'y-current',
                });
              }
            });
          }
        });
      }
  
      // Update the chart data
      setChartData({
        labels,
        datasets,
      });
    } catch (error) {
      console.error('Error fetching readings:', error);
    }
  };
  

  useEffect(() => {
    if (deviceID && startDate && endDate) {
      fetchReadings();
    }
  }, [deviceID, startDate, endDate, selectedParams, selectedPhases]);

  return (
    <div>
      <div className="filters">
        <h3>Filter Options:</h3>
        <input 
        type="text"
        value={deviceID}
        onChange={(e) => setDeviceID(e.target.value)}
        placeholder="Enter Device ID"
      />

        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          placeholderText="Select Start Date"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          placeholderText="Select End Date"
        />

        <Select
          isMulti
          options={parameterOptions}
          value={selectedParams}
          onChange={(selected) => setSelectedParams(selected)}
          placeholder="Select Parameters (Voltage, Current, Power, Pf)"
        />

        <Select
          isMulti
          options={phaseOptions}
          value={selectedPhases}
          onChange={(selected) => setSelectedPhases(selected)}
          placeholder="Select Phases (Phase 1, Phase 2, Phase 3, Others)"
        />

        <button onClick={fetchReadings}>Fetch Data</button>
      </div>

      {chartData.labels && chartData.labels.length > 0 && (
        <div className="chart-container">
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Smart Meter Readings Over Time',
                },
                legend: {
                  position: 'top',
                },
                zoom: {
                  pan: {
                    enabled: true,
                    mode: 'x',  // Allow panning in the x direction
                  },
                  zoom: {
                    wheel: {
                      enabled: true, // Enable zooming with the mouse wheel
                    },
                    pinch: {
                      enabled: true, // Enable zooming with pinch gestures
                    },
                    mode: 'x', // Enable zooming in the x direction
                  },
                },
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Time',
                  },
                },
                'y-voltage': {
                  type: 'linear',
                  position: 'left',
                  title: {
                    display: true,
                    text: 'Voltage (V)',
                  },
                },
                'y-current': {
                  type: 'linear',
                  position: 'right',
                  title: {
                    display: true,
                    text: 'Current (A)',
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
                'y-power': {
                  type: 'linear',
                  position: 'right',
                  title: {
                    display: true,
                    text: 'Power (kW)',
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
              },
            }}
            width={1200}
            height={600}
          />
        </div>
      )}
    </div>
  );
};

export default SmartMeterGraph;