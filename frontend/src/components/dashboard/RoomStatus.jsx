import React from 'react';
import { getRoomStatus, getStatusMeta } from '../../utils/thresholds';
import { useEnvironment } from '../../hooks/useEnvironment';

const RoomStatus = ({ temperature, humidity, lastUpdated, customStatus }) => {
  const { now } = useEnvironment();
  const statusKey = customStatus || getRoomStatus(temperature, humidity, lastUpdated, now);
  const meta = getStatusMeta(statusKey);

  return (
    <span className={`status-badge ${meta.class}`}>
      <span className="dot" />
      <span>{meta.label}</span>
    </span>
  );
};

export default RoomStatus;
